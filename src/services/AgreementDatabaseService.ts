import type { TenancyAgreement } from '../types/TenancyAgreement';

export class AgreementDatabaseService {
    private readonly STORAGE_KEY = 'tenancy_agreements';

    async saveAgreement(agreement: TenancyAgreement): Promise<void> {
        try {
            const agreements = await this.getAllAgreements();
            const existingIndex = agreements.findIndex(a => a.agreementId === agreement.agreementId);
            
            if (existingIndex >= 0) {
                agreements[existingIndex] = agreement;
            } else {
                agreements.push(agreement);
            }

            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(agreements));
        } catch (error) {
            console.error('Failed to save agreement:', error);
            throw new Error('Failed to save agreement');
        }
    }

    async getAgreement(agreementId: string): Promise<TenancyAgreement | null> {
        try {
            const agreements = await this.getAllAgreements();
            return agreements.find(a => a.agreementId === agreementId) || null;
        } catch (error) {
            console.error('Failed to get agreement:', error);
            return null;
        }
    }

    async getAllAgreements(): Promise<TenancyAgreement[]> {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Failed to get agreements:', error);
            return [];
        }
    }

    async deleteAgreement(agreementId: string): Promise<void> {
        try {
            const agreements = await this.getAllAgreements();
            const filteredAgreements = agreements.filter(a => a.agreementId !== agreementId);
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredAgreements));
        } catch (error) {
            console.error('Failed to delete agreement:', error);
            throw new Error('Failed to delete agreement');
        }
    }
}

export default new AgreementDatabaseService();