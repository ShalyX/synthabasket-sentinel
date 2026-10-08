import type {Metadata} from 'next';
import {DeskApp} from '@/components/sentinel/DeskShell';
import './desk.css';
export const metadata:Metadata={
 title:{default:'Sentinel — The Stock Research Desk',template:'%s | Sentinel'},
 description:'A precise, independent research desk for tokenized equities on BNB Chain. Observe verified issuer pricing, compose an allocation, and review live execution quotes before making any trading decision.',
};
export default function SentinelLayout({children}:{children:React.ReactNode}){return <DeskApp>{children}</DeskApp>;}
