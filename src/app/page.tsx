import {redirect} from 'next/navigation';

// This standalone project has one product. The legacy Solana landing page is not included.
export default function Home(){redirect('/sentinel');}
