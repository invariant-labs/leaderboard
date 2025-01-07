import app from '@/app'
import { FastifyRequest, FastifyReply } from 'fastify'

interface IAddUserBody {
  name: string
}

export const getUsers = async (req: FastifyRequest, res: FastifyReply) => {
  const users = await app.db.collection('users').find({}).toArray()
  res.send(users)
}

export const addUser = async (req: FastifyRequest<{ Body: IAddUserBody }>, res: FastifyReply) => {
  const payload = req.body
  const response = await app.db.collection('users').insertOne({ name: payload.name })

  if (response.acknowledged) {
    res.send(200)
  }

  res.send(500)
}
