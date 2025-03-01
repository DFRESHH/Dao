import { useState } from 'react';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import Spinner from 'react-bootstrap/Spinner';
import { ethers } from 'ethers'

const Create = ({ provider, dao, setIsLoading }) => {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('') // Added state for description
  const [amount, setAmount] = useState(0)
  const [address, setAddress] = useState('')
  const [isWaiting, setIsWaiting] = useState(false)
  const [error, setError] = useState('') // Added state for error message

  const createHandler = async (e) => {
    e.preventDefault()
    setIsWaiting(true)
    
    // Simple validation
    if (!name.trim()) {
      setError('Name is required')
      setIsWaiting(false)
      return
    }
    
    if (!description.trim()) {
      setError('Description is required')
      setIsWaiting(false)
      return
    }
    
    if (amount <= 0) {
      setError('Amount must be greater than 0')
      setIsWaiting(false)
      return
    }
    
    if (!address.trim() || !ethers.utils.isAddress(address)) {
      setError('Valid address is required')
      setIsWaiting(false)
      return
    }
    
    // Clear error if validation passes
    setError('')

    try {
      const signer = await provider.getSigner()
      const formattedAmount = ethers.utils.parseUnits(amount.toString(), 'ether')

      // Updated to include description parameter
      const transaction = await dao.connect(signer).createProposal(
        name,
        description, // Pass description to contract
        formattedAmount,
        address
      )
      await transaction.wait()
      
      // Reset form fields
      setName('')
      setDescription('')
      setAmount(0)
      setAddress('')
      
    } catch (err) {
      console.error('Error creating proposal:', err)
      if (err.reason) {
        setError(`Transaction failed: ${err.reason}`)
      } else if (err.message) {
        setError(`Error: ${err.message}`)
      } else {
        setError('User rejected or transaction reverted')
      }
    }

    setIsWaiting(false)
    setIsLoading(true)
  }

  return(
    <Form onSubmit={createHandler}>
      <Form.Group style={{ maxWidth: '450px', margin: '50px auto' }}>
        <h4 className="mb-3 text-center">Create New Proposal</h4>
        
        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}
        
        <Form.Control
          type='text'
          placeholder='Enter name'
          className='my-2'
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        
        <Form.Control
          as='textarea'
          rows={3}
          placeholder='Enter proposal description'
          className='my-2'
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        
        <Form.Control
          type='number'
          placeholder='Enter amount'
          className='my-2'
          value={amount || ''}
          onChange={(e) => setAmount(e.target.value)}
        />
        
        <Form.Control
          type='text'
          placeholder='Enter address'
          className='my-2'
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
        
        {isWaiting ? (
          <Spinner animation="border" style={{ display: 'block', margin: '0 auto' }} />
        ) : (
          <Button variant='primary' type='submit' style={{ width: '100%' }}>
            Create Proposal
          </Button>
        )}
      </Form.Group>
    </Form>
  )
}

export default Create;