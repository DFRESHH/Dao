import { useState, useEffect } from 'react';
import Table from 'react-bootstrap/Table';
import Button from 'react-bootstrap/Button';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';
import { ethers } from 'ethers'

const Proposals = ({ provider, dao, proposals, quorum, setIsLoading }) => {
  const [canVote, setCanVote] = useState(false);
  const [account, setAccount] = useState(null);
  
  // Check if user has tokens and can vote
  useEffect(() => {
    const checkVotingEligibility = async () => {
      try {
        // Get the connected account
        const accounts = await provider.listAccounts();
        const currentAccount = accounts[0];
        setAccount(currentAccount);
        
        if (currentAccount) {
          // Get the token contract from the DAO
          const tokenAddress = await dao.token();
          
          // Create a minimal ABI to get the balance
          const minABI = [
            "function balanceOf(address owner) view returns (uint256)"
          ];
          
          // Create contract instance
          const tokenContract = new ethers.Contract(tokenAddress, minABI, provider);
          
          // Get the token balance
          const balance = await tokenContract.balanceOf(currentAccount);
          
          // User can vote if they have tokens
          setCanVote(balance.gt(0));
        }
      } catch (error) {
        console.error("Error checking voting eligibility:", error);
        setCanVote(false);
      }
    };
    
    if (provider && dao) {
      checkVotingEligibility();
    }
  }, [provider, dao]);
  const upVoteHandler = async (id) => {
    try {
      const signer = await provider.getSigner()
      const transaction = await dao.connect(signer).upVote(id)                  
      await transaction.wait()
    } catch {
      window.alert('User rejected or transaction reverted')
    }
    setIsLoading(true)
  }

  const downVoteHandler = async (id) => {
    try {
      const signer = await provider.getSigner()
      const transaction = await dao.connect(signer).downVote(id)
      await transaction.wait()
    } catch {
      window.alert('User rejected or transaction reverted')
    }

    setIsLoading(true)
  }
  
  const finalizeHandler = async (id) => {
    try {
      const signer = await provider.getSigner()
      const transaction = await dao.connect(signer).finalizeProposal(id)
      await transaction.wait()
    } catch {
      window.alert('User rejected or transaction reverted')
    }

    setIsLoading(true)
  }

  // Calculate net votes for a proposal
  const calculateNetVotes = (proposal) => {
    const upVotes = ethers.BigNumber.from(proposal.upVotes || 0)
    const downVotes = ethers.BigNumber.from(proposal.downVotes || 0)
    return upVotes.gt(downVotes) 
      ? upVotes.sub(downVotes).toString() 
      : '0'
  }
  
  // Check if user has already voted on a specific proposal
  const [votedProposals, setVotedProposals] = useState({});
  
  useEffect(() => {
    const checkVotedProposals = async () => {
      if (!dao || !account) return;
      
      const voted = {};
      
      // Check each proposal if user has voted
      for (const proposal of proposals) {
        try {
          const hasVoted = await dao.votes(account, proposal.id);
          voted[proposal.id.toString()] = hasVoted;
        } catch (error) {
          console.error(`Error checking if voted on proposal ${proposal.id}:`, error);
        }
      }
      
      setVotedProposals(voted);
    };
    
    if (dao && account && proposals) {
      checkVotedProposals();
    }
  }, [dao, account, proposals]);

  return (
    <>
      <div className="mb-3 p-2" style={{ 
        backgroundColor: canVote ? '#d4edda' : '#f8d7da',
        borderRadius: '5px',
        padding: '10px',
        textAlign: 'center'
      }}>
        {canVote ? (
          <span>✅ You are eligible to vote on proposals.</span>
        ) : (
          <span>⚠️ You need to hold tokens to vote on proposals. Consider acquiring some tokens first.</span>
        )}
      </div>
      <Table striped bordered hover responsive>
      <thead>
        <tr>
          <th>#</th>
          <th>Name</th>
          <th>Description</th>
          <th>Recipient</th>
          <th>Amount</th>
          <th>Status</th>
          <th>Up Votes</th>
          <th>Down Votes</th>
          <th>Net Votes</th>
          <th>Actions</th>
          <th>Finalize</th>
        </tr>
      </thead>
      <tbody>
        {proposals.map((proposal, index) => (
          <tr key={index}>
            <td>{proposal.id.toString()}</td>
            <td>{proposal.name}</td>
            <td>{proposal.recipient}</td>
            <td>{ethers.utils.formatUnits(proposal.amount, "ether")} ETH</td>
            <td>{proposal.finalized ? 'Approved' : 'In Progress'}</td>
            <td>{Number(ethers.utils.formatUnits(proposal.upVotes || 0, "ether")).toLocaleString()} tokens</td>
            <td>{Number(ethers.utils.formatUnits(proposal.downVotes || 0, "ether")).toLocaleString()} tokens</td>
            <td
              style={{
                backgroundColor: ethers.BigNumber.from(calculateNetVotes(proposal)).gte(quorum) 
                  ? '#d4edda' 
                  : ethers.BigNumber.from(calculateNetVotes(proposal)).gte(ethers.BigNumber.from(quorum).div(2)) 
                    ? '#fff3cd' 
                    : 'inherit'
              }}
            >
              {Number(ethers.utils.formatUnits(calculateNetVotes(proposal), "ether")).toLocaleString()} tokens
            </td>
            <td>
              {!proposal.finalized && (
                <ButtonGroup style={{ width: '100%' }}>
                  {canVote ? (
                    votedProposals[proposal.id.toString()] ? (
                      <OverlayTrigger
                        placement="top"
                        overlay={<Tooltip>You have already voted on this proposal</Tooltip>}
                      >
                        <div style={{ width: '100%' }}>
                          <Button
                            variant="secondary"
                            disabled
                            style={{ width: '100%' }}
                          >
                            Already Voted
                          </Button>
                        </div>
                      </OverlayTrigger>
                    ) : (
                      <>
                        <Button
                          variant="success"
                          onClick={() => upVoteHandler(proposal.id)}
                        >
                          Up
                        </Button>
                        <Button
                          variant="danger"
                          onClick={() => downVoteHandler(proposal.id)}
                        >
                          Down
                        </Button>
                      </>
                    )
                  ) : (
                    <OverlayTrigger
                      placement="top"
                      overlay={<Tooltip>You need to hold tokens to vote on proposals</Tooltip>}
                    >
                      <div style={{ width: '100%' }}>
                        <Button
                          variant="success"
                          disabled
                          style={{ width: '50%' }}
                        >
                          Up
                        </Button>
                        <Button
                          variant="danger"
                          disabled
                          style={{ width: '50%' }}
                        >
                          Down
                        </Button>
                      </div>
                    </OverlayTrigger>
                  )}
                </ButtonGroup>
              )}
            </td>
            <td>
              {!proposal.finalized && ethers.BigNumber.from(calculateNetVotes(proposal)).gte(quorum) && (
                canVote ? (
                  <Button
                    variant="primary"
                    style={{ width: '100%' }}
                    onClick={() => finalizeHandler(proposal.id)}
                  >
                    Finalize
                  </Button>
                ) : (
                  <OverlayTrigger
                    placement="top"
                    overlay={<Tooltip>You need to hold tokens to finalize proposals</Tooltip>}
                  >
                    <div>
                      <Button
                        variant="primary"
                        style={{ width: '100%' }}
                        disabled
                      >
                        Finalize
                      </Button>
                    </div>
                  </OverlayTrigger>
                )
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
    </>
  );
}

export default Proposals;
