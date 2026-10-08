import type {Metadata} from 'next';
import {DeskApp} from '@/components/sentinel/DeskShell';
import './desk.css';
export const metadata:Metadata={
 title:{default:'Sentinel — Tokenized Stock Basket Agent',template:'%s | Sentinel'},
 description:'Research issuer-backed tokenized equities, construct weighted baskets, inspect live BSC routes and simulate unsigned spot transactions from your connected wallet. No trading without explicit wallet approval.',
};
export default function SentinelLayout({children}:{children:React.ReactNode}){return <DeskApp>{children}</DeskApp>;}
