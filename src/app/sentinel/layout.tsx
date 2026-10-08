import type {Metadata} from 'next';
import {DeskApp} from '@/components/sentinel/DeskShell';
import './desk.css';
export const metadata:Metadata={
 title:{default:'Sentinel — The Stock Research Desk',template:'%s | Sentinel'},
 description:'An independent BNB Chain research desk to compare bStocks and Ondo token wrappers, examine live Binance Web3 quote indications, build a basket thesis, and review risks without trading.',
};
export default function SentinelLayout({children}:{children:React.ReactNode}){return <DeskApp>{children}</DeskApp>;}
