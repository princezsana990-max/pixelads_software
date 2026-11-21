import React, { useState, useEffect } from 'react';
import {
  Settings,
  Building,
  FileText,
  Palette,
  Globe,
  Save,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Image,
} from 'lucide-react';
import { useCompanySettings } from '../../context/CompanySettingsContext';
import { useTheme } from '../../context/ThemeContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';

export const GlobalSettings: React.FC = () => {
  const { settings, updateSettings, isLoading } = useCompanySettings();
  const { theme, setTheme } = useTheme();

  const [activeTab, setActiveTab] = useState<'company' | 'pdf' | 'appearance' | 'regional'>(
    'company'
  );

  const [formData, setFormData] = useState({ ...settings });
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    setFormData({ ...settings });
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveStatus(null);

    const success = await updateSettings(formData);
    setIsSaving(false);
    if (success) {
      setSaveStatus({ success: true, message: 'Settings saved successfully to Supabase.' });
      setTimeout(() => setSaveStatus(null), 3000);
    } else {
      setSaveStatus({ success: false, message: 'Failed to update settings in Supabase.' });
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-page-title text-fg-primary">Global Settings</h1>
        <p className="text-sm text-fg-secondary mt-0.5">
          Configure organization identity, PDF letterhead branding, theme, and regional options.
        </p>
      </div>

      {saveStatus && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center gap-2 ${
            saveStatus.success
              ? 'bg-status-success/10 border-status-success/30 text-status-success'
              : 'bg-status-danger/10 border-status-danger/30 text-status-danger'
          }`}
        >
          {saveStatus.success ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          )}
          <span>{saveStatus.message}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-2 overflow-x-auto">
        {[
          { id: 'company', label: 'Company Profile', icon: Building },
          { id: 'pdf', label: 'PDF & Branding', icon: FileText },
          { id: 'appearance', label: 'Appearance', icon: Palette },
          { id: 'regional', label: 'Regional & Timezone', icon: Globe },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'text-fg-secondary hover:text-fg-primary hover:bg-bg-secondary'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* TAB 1: COMPANY PROFILE */}
        {activeTab === 'company' && (
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
              <p className="text-xs text-fg-secondary mt-0.5">
                Displayed across headers, invoices, attendance sheets, and reports.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Company / Enterprise Name"
                required
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Contact Phone / Hotline"
                  value={formData.contact_number || ''}
                  onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                />
                <Input
                  label="Official Email"
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Website URL"
                  value={formData.website || ''}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                />
                <Input
                  label="Logo Image URL"
                  placeholder="https://.../logo.png"
                  value={formData.logo_url || ''}
                  onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                />
              </div>

              <Textarea
                label="Physical Address / Office Location"
                value={formData.address || ''}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows={2}
              />
            </CardContent>
          </Card>
        )}

        {/* TAB 2: PDF & BRANDING */}
        {activeTab === 'pdf' && (
          <Card>
            <CardHeader>
              <CardTitle>PDF Generation Customization</CardTitle>
              <p className="text-xs text-fg-secondary mt-0.5">
                Controls layout and disclaimers for invoice PDFs and monthly attendance sheets.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select
                label="Header Logo Position"
                value={formData.pdf_logo_position}
                onChange={(e) =>
                  setFormData({ ...formData, pdf_logo_position: e.target.value as any })
                }
                options={[
                  { value: 'left', label: 'Left Aligned' },
                  { value: 'center', label: 'Centered' },
                  { value: 'right', label: 'Right Aligned' },
                ]}
              />

              <Input
                label="PDF Top Header Text"
                value={formData.pdf_header_text || ''}
                onChange={(e) => setFormData({ ...formData, pdf_header_text: e.target.value })}
              />

              <Input
                label="PDF Bottom Footer Text / Copyright"
                value={formData.pdf_footer_text || ''}
                onChange={(e) => setFormData({ ...formData, pdf_footer_text: e.target.value })}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Authorized Signature Image URL (Optional)"
                  placeholder="https://.../signature.png"
                  value={formData.signature_url || ''}
                  onChange={(e) => setFormData({ ...formData, signature_url: e.target.value })}
                />
                <Input
                  label="Official Company Stamp Image URL (Optional)"
                  placeholder="https://.../stamp.png"
                  value={formData.stamp_url || ''}
                  onChange={(e) => setFormData({ ...formData, stamp_url: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* TAB 3: APPEARANCE */}
        {activeTab === 'appearance' && (
          <Card>
            <CardHeader>
              <CardTitle>Theme & Appearance</CardTitle>
              <p className="text-xs text-fg-secondary mt-0.5">
                OrderFlow Pro supports controlled Light and Dark themes.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div
                  onClick={() => {
                    setTheme('light');
                    setFormData({ ...formData, theme: 'light' });
                  }}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    theme === 'light'
                      ? 'border-brand-500 bg-brand-500/5 shadow-xs'
                      : 'border-border bg-bg-surface hover:border-fg-muted/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-fg-primary">Light Theme</span>
                    {theme === 'light' && (
                      <span className="text-brand-500 text-xs font-bold">Active</span>
                    )}
                  </div>
                  <p className="text-xs text-fg-secondary">
                    Clean, high-contrast crisp white layout with subtle purple accents.
                  </p>
                </div>

                <div
                  onClick={() => {
                    setTheme('dark');
                    setFormData({ ...formData, theme: 'dark' });
                  }}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    theme === 'dark'
                      ? 'border-brand-500 bg-brand-500/5 shadow-xs'
                      : 'border-border bg-bg-surface hover:border-fg-muted/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-fg-primary">Dark Theme</span>
                    {theme === 'dark' && (
                      <span className="text-brand-500 text-xs font-bold">Active</span>
                    )}
                  </div>
                  <p className="text-xs text-fg-secondary">
                    Deep charcoal surfaces with reduced eye strain for low-light editing suites.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* TAB 4: REGIONAL & TIMEZONE */}
        {activeTab === 'regional' && (
          <Card>
            <CardHeader>
              <CardTitle>Regional Configuration</CardTitle>
              <p className="text-xs text-fg-secondary mt-0.5">
                Timestamps, currency formatting, and standard display formats.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Display Timezone"
                  value={formData.timezone}
                  onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                  options={[
                    { value: 'Asia/Karachi', label: 'Asia/Karachi (PKT - UTC+05:00)' },
                    { value: 'Asia/Dubai', label: 'Asia/Dubai (GST - UTC+04:00)' },
                    { value: 'Europe/London', label: 'Europe/London (GMT/BST)' },
                    { value: 'America/New_York', label: 'America/New_York (EST - UTC-05:00)' },
                    { value: 'UTC', label: 'UTC' },
                  ]}
                />

                <Select
                  label="Default Currency Code"
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  options={[
                    { value: 'PKR', label: 'PKR (Pakistani Rupee)' },
                    { value: 'USD', label: 'USD (US Dollar)' },
                    { value: 'AED', label: 'AED (UAE Dirham)' },
                    { value: 'GBP', label: 'GBP (British Pound)' },
                    { value: 'EUR', label: 'EUR (Euro)' },
                  ]}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Date Format"
                  value={formData.date_format}
                  onChange={(e) => setFormData({ ...formData, date_format: e.target.value })}
                  options={[
                    { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (ISO Standard)' },
                    { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
                    { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
                  ]}
                />

                <Select
                  label="Time Format"
                  value={formData.time_format}
                  onChange={(e) => setFormData({ ...formData, time_format: e.target.value as any })}
                  options={[
                    { value: '12h', label: '12-Hour (AM/PM)' },
                    { value: '24h', label: '24-Hour (Military)' },
                  ]}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Controls */}
        <div className="flex justify-end pt-4">
          <Button
            variant="primary"
            type="submit"
            size="lg"
            isLoading={isSaving}
            icon={<Save className="w-4 h-4" />}
          >
            Save All Settings
          </Button>
        </div>
      </form>
    </div>
  );
};
