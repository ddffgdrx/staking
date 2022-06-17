//SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

// import "hardhat/console.sol";
import {IERC20, SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// comments, naming convention
// decimals
// stakingLive
// mandatory to set reward
// separate fn for emergency update? transfer all tokens in emergency update or acc to user input?
// force update reward details when updating reward address, if we force update then old reward would be lost because no withdraw fn
// emergency pause?
// change compiler to latest

error ZeroAmount();
error AmountLessThanStakedAmountOrZero();
error InsufficientFunds();
error ZeroAddress();

contract UnipilotStaking {
    using SafeERC20 for IERC20;

    // Info of each user.
    struct UserInfo {
        uint256 amount; // Amount of pilot tokens staked by the user
        uint256 rewardDebt; // Reward debt
    }

    // Type of the transaction - to adjust user info
    // enum TX_TYPE {
    //     STAKE,
    //     UNSTAKE,
    //     CLAIM
    // }

    IERC20 public immutable pilotToken;
    IERC20 public rewardToken;

    address public governance;

    // Precision factor for multiple calculations
    uint256 public constant ONE = 10e18;

    // Accumulated reward per pilot token
    uint256 public accRewardPerPilot;

    // Last update block for rewards
    uint256 public lastUpdateBlock;

    // Total pilot tokens staked
    uint256 public totalPilotStaked;

    // Reward to distribute per block
    uint256 public currentRewardPerBlock;

    // Current end block for the current reward period
    uint256 public periodEndBlock;

    mapping(address => UserInfo) public userInfo;

    event Stake(address indexed user, uint256 amount, uint256 pendingReward);
    event Unstake(address indexed user, uint256 amount, uint256 pendingReward, bool emergencyUnstake);
    event NewRewardPeriod(
        uint256 numberBlocksToDistributeRewards,
        uint256 newRewardPerBlock,
        uint256 rewardToDistribute,
        uint256 rewardExpirationBlock
    );
    event Claim(address indexed user, uint256 pendingReward);
    event GovernanceChanged(address indexed oldGovernance, address indexed newGovernance);
    event RewardTokenChanged(address indexed oldRewardToken, address indexed newRewardToken);

    /**
     * @notice Constructor
     * @param _pilotToken address of the pilot token
     * @param _rewardToken address of the reward token
     * @param _governance governance address of unipilot staking
     */
    constructor(
        address _pilotToken,
        address _rewardToken,
        address _governance
    ) {
        if (_pilotToken == address(0) || _rewardToken == address(0) || _governance == address(0)) {
            revert ZeroAddress();
        }
        rewardToken = IERC20(_rewardToken);
        pilotToken = IERC20(_pilotToken);
        governance = _governance;
    }

    modifier onlyGovernance() {
        require(msg.sender == governance);
        _;
    }

    /**
     * @notice Updates the governance of this contract
     * @param _newGovernance address of the new governance of this contract
     * @dev Only callable by Governance
     */
    function setGovernance(address _newGovernance) external onlyGovernance {
        if (_newGovernance == address(0)) {
            revert ZeroAddress();
        }
        governance = _newGovernance;
        emit GovernanceChanged(governance, _newGovernance);
    }

    /**
     * @notice Updates the reward token
     * @param _newRewardToken address of the new reward token
     * @dev Only callable by Governance
     */
    function updateRewardToken(address _newRewardToken) external onlyGovernance {
        if (_newRewardToken == address(0)) {
            revert ZeroAddress();
        }
        emit RewardTokenChanged(address(rewardToken), _newRewardToken);
        rewardToken = IERC20(_newRewardToken);
    }

    /**
     * @notice Update the reward per block
     * @param reward total reward to distribute
     * @param rewardDurationInBlocks total number of blocks in which the 'reward' should be distributed
     * @dev Only callable by Governance
     */
    function updateRewards(uint256 reward, uint256 rewardDurationInBlocks) external onlyGovernance {
        if (reward == 0 || rewardDurationInBlocks == 0) {
            revert ZeroAmount();
        }

        // Adjust the current reward per block
        if (block.number >= periodEndBlock) {
            currentRewardPerBlock = reward / rewardDurationInBlocks;
        } else {
            currentRewardPerBlock =
                (reward + ((periodEndBlock - block.number) * currentRewardPerBlock)) /
                rewardDurationInBlocks;
        }

        lastUpdateBlock = block.number;
        periodEndBlock = block.number + rewardDurationInBlocks;

        emit NewRewardPeriod(rewardDurationInBlocks, currentRewardPerBlock, reward, periodEndBlock);
    }

    /**
     * @notice Stake pilot tokens. Also triggers a claim.
     * @param amount amount of pilot tokens to stake
     */
    function stake(uint256 amount) external {
        if (amount == 0) {
            revert ZeroAmount();
        }

        // Update reward calculation and block
        _updateRewardPerPilotAndLastBlock();

        // Transfer Pilot tokens to this contract
        pilotToken.safeTransferFrom(msg.sender, address(this), amount);

        uint256 pendingRewards;

        // Claim rewards if not new stake
        if (userInfo[msg.sender].amount > 0) {
            pendingRewards = _distributeRewards();
        }

        // Adjust user information
        userInfo[msg.sender].amount += amount;
        userInfo[msg.sender].rewardDebt = (userInfo[msg.sender].amount * accRewardPerPilot) / ONE;

        // Increase total pilot staked amount
        totalPilotStaked += amount;

        emit Stake(msg.sender, amount, pendingRewards);
    }

    /**
     * @notice Unstake pilot tokens. Also triggers a reward claim (if not emergency unstake).
     * @param amount amount of pilot tokens to unstake
     * @param isEmergencyUnstake whether the unstake is emergency. Skips reward claim if true.
     */
    function unstake(uint256 amount, bool isEmergencyUnstake) external {
        if ((amount > userInfo[msg.sender].amount) && (amount == 0)) {
            revert AmountLessThanStakedAmountOrZero();
        }

        // Update reward calculation and block
        _updateRewardPerPilotAndLastBlock();

        // Adjust total pilot staked amount
        totalPilotStaked -= amount;

        uint256 pendingRewards;

        // Skip reward calculation if it's an emergency unstake transaction
        if (!isEmergencyUnstake) {
            pendingRewards = _distributeRewards();
        }

        // Adjust user information
        userInfo[msg.sender].amount -= amount;
        userInfo[msg.sender].rewardDebt = (userInfo[msg.sender].amount * accRewardPerPilot) / ONE;

        // Transfer Pilot tokens back to the sender
        pilotToken.safeTransfer(msg.sender, amount);

        emit Unstake(msg.sender, amount, pendingRewards, isEmergencyUnstake);
    }

    /**
     * @notice Claim pending rewards.
     */
    function claim() external {
        // Update reward calculation and block
        _updateRewardPerPilotAndLastBlock();

        uint256 pendingRewards = _distributeRewards();

        // Adjust user information
        userInfo[msg.sender].rewardDebt = (userInfo[msg.sender].amount * accRewardPerPilot) / ONE;

        emit Claim(msg.sender, pendingRewards);
    }

    /**
     * @notice Calculate pending rewards for a user
     * @param user address of the user
     */
    function calculatePendingRewards(address user) external view returns (uint256) {
        return _calculatePendingRewards(user);
    }

    /**
     * @notice Return last block where trading rewards were distributed
     */
    function lastRewardBlock() external view returns (uint256) {
        return _lastRewardBlock();
    }

    /**
     * @notice Updates accumulated reward to distribute per pilot token. Also updates the last block in which rewards are distributed
     */
    function _updateRewardPerPilotAndLastBlock() private {
        // less than end period?

        if (totalPilotStaked == 0) {
            lastUpdateBlock = _lastRewardBlock();
            return;
        }

        accRewardPerPilot +=
            ((_lastRewardBlock() - lastUpdateBlock) * (currentRewardPerBlock * ONE)) /
            totalPilotStaked;
        if (block.number != lastUpdateBlock) {
            lastUpdateBlock = _lastRewardBlock();
        }
    }

    /**
     * @notice Distributes pending reward (if any) to the sender
     * @dev revert if contract has insufficient funds
     */
    function _distributeRewards() private returns (uint256 pendingRewards) {
        // Calculate pending rewards
        pendingRewards = _calculatePendingRewards(msg.sender);

        if (pendingRewards > 0) {
            if (pendingRewards > rewardToken.balanceOf(address(this))) {
                revert InsufficientFunds();
            }
            rewardToken.safeTransfer(msg.sender, pendingRewards);
        }
    }

    /**
     * @notice Calculate pending rewards for a user
     * @param user address of the user
     */
    function _calculatePendingRewards(address user) private view returns (uint256) {
        return ((userInfo[user].amount * accRewardPerPilot) / ONE) - userInfo[user].rewardDebt;
    }

    /**
     * @notice Return last block where rewards must be distributed
     */
    function _lastRewardBlock() private view returns (uint256) {
        return block.number < periodEndBlock ? block.number : periodEndBlock;
    }

    // /**
    //  * @notice Returns a scaling factor that, when multiplied to a token amount for `token`, normalizes its balance as if
    //  * it had 18 decimals.
    //  */
    // function _computeScalingFactor(IERC20 token) private view returns (uint256) {
    //     // Tokens that don't implement the `decimals` method are not supported.
    //     uint256 tokenDecimals = token.decimals();

    //     // Tokens with more than 18 decimals are not supported.
    //     uint256 decimalsDifference = 18 - tokenDecimals;
    //     return 10**decimalsDifference;
    // }
}