import type {Metadata} from 'next';
import {DeskApp} from '@/components/sentinel/DeskShell';
import './desk.css';
import './product.css';
export const metadata:Metadata={
 title:{default:'Sentinel — Tokenized Stock Basket Agent',template:'%s | Sentinel'},
 description:'Discover issuer-backed tokenized stocks, build a basket, review live execution checks and observe actual BSC positions. No real purchase is enabled without independently cleared execution safety and user approval.',
};
export default function SentinelLayout({children}:{children:React.ReactNode}){return <DeskApp>{children}</DeskApp>;}
