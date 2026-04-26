'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, UserPlus, Mail, Shield, ShieldAlert, User, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface TeamMember {
  _id: string;
  email: string;
  name?: string;
  b2b: {
    role: 'admin' | 'recruiter' | 'member';
  };
  createdAt: string;
}

export default function TeamManagement() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Invite Modal State
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('recruiter');
  const [inviting, setInviting] = useState(false);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/b2b/team');
      const data = await res.json();
      if (data.success) {
        setMembers(data.data);
      }
    } catch (error) {
      toast.error('Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    try {
      const res = await fetch('/api/b2b/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole })
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success(`Invited ${inviteEmail} to the team`);
        setShowInvite(false);
        setInviteEmail('');
        fetchMembers();
      } else {
        toast.error(data.error || 'Failed to invite member');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (id: string, newRole: string) => {
    try {
      const res = await fetch(`/api/b2b/team/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success('Role updated');
        setMembers(members.map(m => m._id === id ? { ...m, b2b: { ...m.b2b, role: newRole as any } } : m));
      } else {
        toast.error(data.error || 'Failed to update role');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  const handleRemove = async (id: string, email: string) => {
    if (!confirm(`Are you sure you want to remove ${email} from your team? They will lose all access.`)) return;
    
    try {
      const res = await fetch(`/api/b2b/team/${id}`, { method: 'DELETE' });
      const data = await res.json();
      
      if (data.success) {
        toast.success('Member removed');
        setMembers(members.filter(m => m._id !== id));
      } else {
        toast.error(data.error || 'Failed to remove member');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  return (
    <Card className="bg-white/40 dark:bg-black/40 backdrop-blur-xl border-white/40 dark:border-white/10 shadow-lg">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <CardTitle>Team Management</CardTitle>
            <CardDescription>Invite and manage users who have access to this B2B dashboard.</CardDescription>
          </div>
          <Button onClick={() => setShowInvite(true)} className="gap-2 shrink-0">
            <UserPlus className="w-4 h-4" /> Invite Member
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {loading ? (
            <div className="py-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></div>
          ) : members.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No team members found.</div>
          ) : (
            <div className="border rounded-md divide-y">
              {members.map(member => (
                <div key={member._id} className="flex flex-col sm:flex-row justify-between sm:items-center p-4 gap-4 bg-white dark:bg-black/20">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                      {member.name ? member.name.charAt(0).toUpperCase() : member.email.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {member.name || 'User'}
                        {member.b2b.role === 'admin' && <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">Owner</Badge>}
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Mail className="w-3 h-3" /> {member.email}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 sm:ml-auto pl-12 sm:pl-0">
                    <Select 
                      defaultValue={member.b2b.role} 
                      onValueChange={(val) => handleRoleChange(member._id, val)}
                    >
                      <SelectTrigger className="w-[130px] h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">
                          <div className="flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-amber-500" /> Admin</div>
                        </SelectItem>
                        <SelectItem value="recruiter">
                          <div className="flex items-center gap-2"><User className="w-4 h-4 text-blue-500" /> Recruiter</div>
                        </SelectItem>
                        <SelectItem value="member">
                          <div className="flex items-center gap-2"><Shield className="w-4 h-4 text-gray-500" /> Member</div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleRemove(member._id, member.email)}
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>

      {/* Invite Modal */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b">
              <h3 className="text-lg font-bold">Invite Team Member</h3>
              <p className="text-sm text-muted-foreground mt-1">They will be able to log in and access this business dashboard.</p>
            </div>
            <form onSubmit={handleInvite} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Email Address</label>
                <Input required type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="colleague@company.com" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Role</label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin (Full Access + Billing)</SelectItem>
                    <SelectItem value="recruiter">Recruiter (Manage Jobs & Candidates)</SelectItem>
                    <SelectItem value="member">Member (View Only)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="pt-4 flex gap-3 justify-end">
                <Button type="button" variant="outline" onClick={() => setShowInvite(false)}>Cancel</Button>
                <Button type="submit" disabled={inviting}>
                  {inviting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Send Invite
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Card>
  );
}
