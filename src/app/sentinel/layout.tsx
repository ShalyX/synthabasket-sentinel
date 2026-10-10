import type {Metadata} from 'next';
import {DeskApp} from '@/components/sentinel/DeskShell';
import './desk.css';
import './product.css';
export const metadata:Metadata={
 title:{default:'Sentinel — Tokenized Stock Basket Agent',template:'%s | Sentinel'},
 description:'Build issuer-aware tokenized-stock baskets, review live BSC quotes and simulations, authorize purchases through browser or Agentic Wallet, and verify settlement.',
};
export default function SentinelLayout({children}:{children:React.ReactNode}){return <DeskApp>{children}</DeskApp>;}
