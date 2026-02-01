export type InvestorType = 'FOUNDER' | 'INVESTOR' | 'EMPLOYEE';

export interface InvestorGroup {
    id: string;
    name: string;
    color?: string;
}

export interface Investor {
    id: string;
    name: string;
    type: InvestorType;
    groupId?: string;
}

export interface Shareholding {
    investorId: string;
    shares: number;
}

export interface Investment {
    id: string;
    investorId: string;
    amount: number;
    shares: number;
    isSecondary: boolean;
    sellerId?: string; // If secondary, who is selling
    pricePerShare?: number; // 구주 매매 시 주당 가격 (optional)
}

export interface Round {
    id: string;
    name: string;
    date: string;

    // Valuation Logic
    preMoneyValuation: number;
    postMoneyValuation: number;
    sharePrice: number;
    totalNewShares: number;
    investmentAmount: number;

    investments: Investment[];
}

export interface CapTable {
    rounds: Round[];
    investors: Investor[];
    currentHoldings: Shareholding[]; // Computed state
}

export interface Simulation {
    id: string;
    name: string;
    rounds: Round[];
    investors: Investor[];
    investorGroups: InvestorGroup[];
    createdAt: string;
    updatedAt: string;
}
