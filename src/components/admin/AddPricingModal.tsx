'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { COUNTRY_NAMES, SUPPORTED_CURRENCIES, DEFAULT_PLAN_KEY } from '@/lib/config/adminConstants';
import { useToast } from '@/hooks/use-toast';

interface AddPricingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    plans: any[];
}

export default function AddPricingModal({ isOpen, onClose, onSuccess, plans }: AddPricingModalProps) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        countryCode: '',
        currency: 'USD',
        currencySymbol: '$',
        monthly: '',
        quarterly: '',
        yearly: '',
        lifetime: ''
    });

    // Sort country code options by name
    const countryOptions = Object.entries(COUNTRY_NAMES).sort((a, b) => a[1].localeCompare(b[1]));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Resolve Plan IDs
            const findPlanId = (key: string) => plans.find((p: any) => p.key === key)?._id || '';

            const payload = {
                countryCode: formData.countryCode,
                countryName: COUNTRY_NAMES[formData.countryCode] || formData.countryCode,
                currency: formData.currency,
                currencySymbol: formData.currencySymbol,
                regionId: 'default', // Using a default region ID
                planPrices: {
                    free: {
                        price: 0,
                        planId: findPlanId(DEFAULT_PLAN_KEY)
                    },
                    monthly: {
                        price: parseFloat(formData.monthly) || 0,
                        planId: findPlanId('pro_monthly')
                    },
                    quarterly: {
                        price: parseFloat(formData.quarterly) || 0,
                        planId: findPlanId('pro_quarterly')
                    },
                    yearly: {
                        price: parseFloat(formData.yearly) || 0,
                        planId: findPlanId('pro_yearly')
                    },
                    lifetime: {
                        price: parseFloat(formData.lifetime) || 0,
                        planId: findPlanId('pro_lifetime')
                    }
                }
            };

            const response = await fetch('/api/admin/country-pricing', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error('Failed to create pricing');
            }

            toast({
                title: "Success",
                description: "Regional pricing added successfully",
            });

            onSuccess();
            onClose();
            // Reset form
            setFormData({
                countryCode: '',
                currency: 'USD',
                currencySymbol: '$',
                monthly: '',
                quarterly: '',
                yearly: '',
                lifetime: ''
            });

        } catch (error) {
            console.error(error);
            toast({
                title: "Error",
                description: "Failed to add regional pricing",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Add Regional Pricing</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Country</Label>
                            <Select
                                value={formData.countryCode}
                                onValueChange={(val) => setFormData(prev => ({ ...prev, countryCode: val }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Country" />
                                </SelectTrigger>
                                <SelectContent>
                                    {countryOptions.map(([code, name]) => (
                                        <SelectItem key={code} value={code}>
                                            {name} ({code})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Currency</Label>
                            <Select
                                value={formData.currency}
                                onValueChange={(val) => setFormData(prev => ({ ...prev, currency: val }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Currency" />
                                </SelectTrigger>
                                <SelectContent>
                                    {SUPPORTED_CURRENCIES.map((curr) => (
                                        <SelectItem key={curr} value={curr}>
                                            {curr}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Currency Symbol</Label>
                        <Input
                             value={formData.currencySymbol}
                             onChange={(e) => setFormData(prev => ({ ...prev, currencySymbol: e.target.value }))}
                             placeholder="$"
                             className="w-20"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Monthly</Label>
                            <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={formData.monthly}
                                onChange={(e) => setFormData(prev => ({ ...prev, monthly: e.target.value }))}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Quarterly</Label>
                            <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={formData.quarterly}
                                onChange={(e) => setFormData(prev => ({ ...prev, quarterly: e.target.value }))}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Yearly</Label>
                            <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={formData.yearly}
                                onChange={(e) => setFormData(prev => ({ ...prev, yearly: e.target.value }))}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Lifetime</Label>
                            <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={formData.lifetime}
                                onChange={(e) => setFormData(prev => ({ ...prev, lifetime: e.target.value }))}
                                required
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading || !formData.countryCode}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Add Country
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
