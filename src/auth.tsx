import {createContext,useContext,useEffect,useState,type ReactNode} from 'react';
import {api,type User} from './api';
type AuthState={user:User|null;loading:boolean;refresh:()=>Promise<void>;setUser:(user:User|null)=>void;logout:()=>Promise<void>};
const Context=createContext<AuthState>({user:null,loading:true,refresh:async()=>{},setUser:()=>{},logout:async()=>{}});
export function AuthProvider({children}:{children:ReactNode}){
  const [user,setUser]=useState<User|null>(null),[loading,setLoading]=useState(true);
  const refresh=async()=>{try{const data=await api<{user:User|null}>('/auth/me');setUser(data.user);}catch{setUser(null);}finally{setLoading(false);}};
  useEffect(()=>{void refresh();},[]);
  const logout=async()=>{await api('/auth/logout',{method:'POST'});setUser(null);};
  return <Context.Provider value={{user,loading,refresh,setUser,logout}}>{children}</Context.Provider>;
}
export const useAuth=()=>useContext(Context);
