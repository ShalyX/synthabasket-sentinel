import type {Metadata} from 'next';
import {Inter,JetBrains_Mono} from 'next/font/google';
import './globals.css';

const inter=Inter({subsets:['latin'],variable:'--font-sans'});
const mono=JetBrains_Mono({subsets:['latin'],variable:'--font-mono'});

export const metadata:Metadata={
 title:'SynthaBasket Sentinel | Tokenized Stock Research on BNB Chain',
 description:'Independent BNB Chain tokenized-stock research: issuer contracts, conversion-adjusted parity, basket allocations and guarded quote review.',
};

export default function RootLayout({children}:{children:React.ReactNode}){
 return <html lang="en"><body className={`${inter.variable} ${mono.variable} antialiased`}>{children}</body></html>;
}
