//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "./Token.sol";

contract DAO {
    address public owner;
    Token public token;
    uint256 public quorum;

    struct Proposal {
        uint256 id;
        string name;
        string description;
        uint256 amount;
        address payable recipient;
        uint256 upVotes;   // Changed from 'votes' to 'upVotes'
        uint256 downVotes;  // Added to track negative votes
        bool finalized;
    }

    uint256 public proposalCount;
    mapping(uint256 => Proposal) public proposals;

    mapping(address => mapping(uint256 => bool)) public votes;

    event Propose(
        uint id,
        uint256 amount,
        address recipient,
        address creator
    );
    event Vote(uint256 id, address investor, bool inFavor);
    event Finalize(uint256 id);

    constructor(Token _token, uint256 _quorum) {
        owner = msg.sender;
        token = _token;
        quorum = _quorum;
    }

    // Allow contract to receive ether
    receive() external payable {}

    modifier onlyInvestor() {
        require(
            token.balanceOf(msg.sender) > 0,
            "must be token holder"
        );
        _;
    }

    // Create proposal
    function createProposal(
        string memory _name,
        string memory _description,
        uint256 _amount,
        address payable _recipient
    ) external onlyInvestor {
        require(address(this).balance >= _amount);
        require(bytes(_description).length > 0, "Description cannot be empty");

        proposalCount++;

        proposals[proposalCount] = Proposal(
            proposalCount,
            _name,
            _description,
            _amount,
            _recipient,
            0,
            0,
            false
        );

        emit Propose(
            proposalCount,
            _amount,
            _recipient,
            msg.sender
        );
    }

    // Vote in favor of proposal
    function upVote(uint256 _id) external onlyInvestor {
        // Fetch proposal from mapping by id
        Proposal storage proposal = proposals[_id];

        // Don't let investors vote twice
        require(!votes[msg.sender][_id], "already voted");

        // update votes
        proposal.upVotes += token.balanceOf(msg.sender);

        // Track that user has voted
        votes[msg.sender][_id] = true;

        // Emit an event
        emit Vote(_id, msg.sender, true); // Added true to indicate upvote
    }

    // Vote against a proposal
    function downVote(uint256 _id) external onlyInvestor {
        // Fetch proposal from mapping by id
        Proposal storage proposal = proposals[_id];

        // Don't let investors vote twice
        require(!votes[msg.sender][_id], "already voted");

        // update down votes
        proposal.downVotes += token.balanceOf(msg.sender);

         // Track that user has voted
        votes[msg.sender][_id] = true;

        // Emit an event
        emit Vote(_id, msg.sender, false); // boolean 'false' indicates a down vote
    }

    // For backward compatibility - implements same behavior as upVote
    function vote(uint256 _id) external onlyInvestor {
        // Fetch proposal from mapping by id
        Proposal storage proposal = proposals[_id];

        // Don't let investors vote twice
        require(!votes[msg.sender][_id], "already voted");

        // update votes
        proposal.upVotes += token.balanceOf(msg.sender);

        // Track that user has voted
        votes[msg.sender][_id] = true;

        // Emit an event
        emit Vote(_id, msg.sender, true);
    }

    // Finalize proposal & transfer funds
    function finalizeProposal(uint256 _id) external onlyInvestor {
        // Fetch proposal from mapping by id
        Proposal storage proposal = proposals[_id];

        // Ensure proposal is not already finalized
        require(proposal.finalized == false, "proposal already finalized");

        // Mark proposal as finalized
        proposal.finalized = true;

        // Calculate net votes (upVotes minus downVotes)
        uint256 netVotes = 0;
        if (proposal.upVotes > proposal.downVotes) {
            netVotes = proposal.upVotes - proposal.downVotes;
        }

        // Check that proposal has enough votes
        require(netVotes >= quorum, "must reach quorum to finalize proposal");

        // Check that the contract has enough ether
        require(address(this).balance >= proposal.amount);

        // Transfer the funds to recipient
        (bool sent, ) = proposal.recipient.call{value: proposal.amount}("");
        require(sent);

        // Emit event
        emit Finalize(_id);
    }
}