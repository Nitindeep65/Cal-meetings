import NextAuth from "next-auth/next"
import { authOptions } from "../../../src/lib/auth"

export default NextAuth(authOptions)