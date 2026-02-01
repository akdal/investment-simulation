import type { Round, Investor, Shareholding, Investment } from '../types';

/**
 * 라운드 메트릭 계산
 * - 주당 발행가격(sharePrice)은 직접 입력
 * - 투자자별 주식수(shares) 입력 → 투자금(amount) 자동 계산
 */
export const calculateRoundMetrics = (
    sharePrice: number,
    totalSharesBeforeRound: number,
    investments: Investment[]
) => {
    // 투자금 = 주식수 * 주당 가격 (신주 발행만)
    const updatedInvestments = investments.map(inv => {
        if (inv.isSecondary) return inv;

        // 신주 발행: 주식수 기반으로 투자금 계산
        const amount = inv.shares * sharePrice;
        return { ...inv, amount };
    });

    // 신주 발행 주식수 합계
    const totalNewShares = updatedInvestments.reduce((sum, inv) =>
        inv.isSecondary ? sum : sum + inv.shares, 0
    );

    // 총 투자금 (신주 발행분만)
    const totalInvestmentAmount = updatedInvestments.reduce((sum, inv) =>
        inv.isSecondary ? sum : sum + inv.amount, 0
    );

    // 프리머니 = 주당 가격 * 기존 주식수
    const preMoneyValuation = sharePrice * totalSharesBeforeRound;

    // 포스트머니 = 프리머니 + 총 투자금
    const postMoneyValuation = preMoneyValuation + totalInvestmentAmount;

    return {
        sharePrice,
        totalNewShares,
        investmentAmount: totalInvestmentAmount,
        preMoneyValuation,
        postMoneyValuation,
        updatedInvestments
    };
};


export const calculateCapTable = (rounds: Round[], _initialInvestors: Investor[]): Shareholding[] => {
    const holdings = new Map<string, number>();

    for (const round of rounds) {
        for (const inv of round.investments) {
            if (inv.isSecondary) {
                // 구주 매매: 매도자 → 매수자
                if (inv.sellerId) {
                    const currentSellerShares = holdings.get(inv.sellerId) || 0;
                    holdings.set(inv.sellerId, Math.max(0, currentSellerShares - inv.shares));
                }
                const currentBuyerShares = holdings.get(inv.investorId) || 0;
                holdings.set(inv.investorId, currentBuyerShares + inv.shares);
            } else {
                // 신주 발행
                const currentShares = holdings.get(inv.investorId) || 0;
                holdings.set(inv.investorId, currentShares + inv.shares);
            }
        }
    }

    const result: Shareholding[] = [];
    holdings.forEach((shares, investorId) => {
        if (shares > 0) {
            result.push({ investorId, shares });
        }
    });

    return result;
};
