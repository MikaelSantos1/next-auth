import {  createContext, ReactNode, useEffect, useState } from "react"
import { api } from "../services/api";
import { useRouter} from 'next/router'
import {setCookie, parseCookies, destroyCookie } from 'nookies'
type User={
    email:string;
    permissions:string[];
    roles:string[];
}

type SignInCredentials={
    email:string;
    password:string;
}

type AuthContextData={
    signIn(credentials:SignInCredentials):Promise<void>;
    user:User;
    isAuthenticated:boolean;
}
type AuthProviderProps={
    children:ReactNode;
}


export const AuthContext = createContext({} as AuthContextData)

export function signOut(){
    const router= useRouter()
    destroyCookie(undefined,'nextauth.token')
        destroyCookie(undefined,'nextauth.refreshToken')
        router.push('/')
}

export function AuthProvider({children}:AuthProviderProps){

    const router= useRouter()
    const [user,setUser]=useState<User>()
    const isAuthenticated=!!user;
    
    useEffect(()=>{
        const {'nextauth.token':token}= parseCookies()

        if(token){
            api.get('/me').then(response=>{
               const { email,permissions,roles}= response.data

               setUser({email,permissions,roles})
            })
            .catch(error=>{
               signOut()
            })
        }
    },[])
    
   async function signIn({email,password}:SignInCredentials){
      try{
        const response= await api.post('sessions',{
            email,
            password
        })
        const{permissions,roles,token,refreshToken}=response.data

        setCookie(undefined,'nextauth.token',token,{
            maxAge: 60 * 60 * 24 * 30, //30days
            path:'/'

        })
        setCookie(undefined,'nextauth.refreshToken',refreshToken,{
            maxAge: 60 * 60 * 24 * 30, //30days
            path:'/'
        })

        setUser({
            email,
            permissions,
            roles
        })
        api.defaults.headers['Authorization'] = `Bearer ${token}`

        router.push('/dashboard')
      }catch(err){
        console.log(err)
      }
       
    }   
    return(
       <AuthContext.Provider value={{signIn,isAuthenticated,user}}>
           {children}
       </AuthContext.Provider>
    )
}