import React from 'react';

export interface HeaderSnippetProps {
  name: string;
  email: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  date: string;
  recipientName?: string;
  companyName?: string;
}

export function ClassicHeader({
  name, email, phone, location, linkedin, date, recipientName, companyName
}: HeaderSnippetProps) {
  return (
    <div className="mb-4 border-b-2 border-gray-800 pb-4 text-gray-800">
      <div className="flex flex-col items-center justify-center text-center">
        <h1 className="text-3xl font-serif font-bold uppercase tracking-widest mb-1">{name}</h1>
        <div className="flex flex-wrap justify-center gap-2 text-sm font-serif">
          {email && <span>{email}</span>}
          {phone && <><span className="text-gray-400">•</span><span>{phone}</span></>}
          {location && <><span className="text-gray-400">•</span><span>{location}</span></>}
          {linkedin && <><span className="text-gray-400">•</span><span>{linkedin}</span></>}
        </div>
      </div>
      
      <div className="mt-4 flex flex-col items-start font-serif text-sm">
        <p>{date}</p>
        <div className="mt-2">
          {recipientName && <p className="font-bold">{recipientName}</p>}
          {companyName && <p>{companyName}</p>}
        </div>
      </div>
    </div>
  );
}

export function ModernHeader({
  name, email, phone, location, linkedin, date, recipientName, companyName
}: HeaderSnippetProps) {
  return (
    <div className="mb-4 flex flex-col md:flex-row justify-between items-start md:items-center text-gray-800 border-l-4 border-[var(--cv-accent,#80FF00)] pl-6 py-1">
      <div className="flex flex-col">
        <h1 className="text-4xl font-sans font-black tracking-tighter mb-0.5">{name}</h1>
        <div className="text-sm font-sans text-gray-500 space-y-0.5">
          {recipientName && <p className="font-semibold text-gray-700 mt-2">To: {recipientName}</p>}
          {companyName && <p>{companyName}</p>}
          <p className="mt-0.5">{date}</p>
        </div>
      </div>
      
      <div className="mt-4 md:mt-0 flex flex-col items-start md:items-end text-sm font-sans text-gray-600 space-y-0.5">
        {email && <p>{email}</p>}
        {phone && <p>{phone}</p>}
        {location && <p>{location}</p>}
        {linkedin && <p>{linkedin}</p>}
      </div>
    </div>
  );
}

export function MinimalHeader({
  name, email, phone, location, linkedin, date, recipientName, companyName
}: HeaderSnippetProps) {
  return (
    <div className="mb-6 text-gray-800">
      <h1 className="text-2xl font-sans font-semibold mb-3">{name}</h1>
      <div className="flex flex-col space-y-0.5 text-sm text-gray-600 mb-4">
        {email && <p>{email}</p>}
        {phone && <p>{phone}</p>}
        {location && <p>{location}</p>}
      </div>
      
      <div className="text-sm">
        <p className="mb-2">{date}</p>
        {recipientName && <p className="font-bold">{recipientName}</p>}
        {companyName && <p>{companyName}</p>}
      </div>
    </div>
  );
}

export function TypographicHeader({
  name, email, phone, location, linkedin, date, recipientName, companyName
}: HeaderSnippetProps) {
  return (
    <div className="mb-8 text-gray-800">
      <h1 className="text-5xl font-black leading-none tracking-tighter mb-3 uppercase italic">{name}</h1>
      <div className="flex items-center gap-3 mb-5">
        <div className="h-0.5 w-12 bg-[var(--cv-accent,#80FF00)] shrink-0" />
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-bold uppercase tracking-widest text-gray-500">
          {email && <span>{email}</span>}
          {phone && <span>{phone}</span>}
          {location && <span>{location}</span>}
        </div>
      </div>
      <div className="text-sm border-l-2 border-gray-200 pl-4 py-1">
        <p className="font-bold">{date}</p>
        <div className="mt-2 text-gray-600">
          {recipientName && <p className="font-bold text-gray-800">{recipientName}</p>}
          {companyName && <p>{companyName}</p>}
        </div>
      </div>
    </div>
  );
}

export function ColumnSplitHeader({
  name, email, phone, location, linkedin, date, recipientName, companyName
}: HeaderSnippetProps) {
  return (
    <div className="mb-8 flex justify-between items-start gap-8 pb-4 border-b border-gray-200 text-gray-800">
      <div className="flex-1">
        <h1 className="text-3xl font-extrabold tracking-tight mb-1">{name}</h1>
        <div className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--cv-accent,#80FF00)] mb-4">Cover Letter</div>
        <div className="text-sm">
          <p className="font-bold text-gray-900">{date}</p>
          <div className="mt-2">
            {recipientName && <p className="font-bold">{recipientName}</p>}
            {companyName && <p className="text-gray-600">{companyName}</p>}
          </div>
        </div>
      </div>
      <div className="flex flex-col items-end text-right gap-1 text-[11px] font-medium text-gray-500">
        {email && <p>{email}</p>}
        {phone && <p>{phone}</p>}
        {location && <p>{location}</p>}
        {linkedin && <p>{linkedin}</p>}
      </div>
    </div>
  );
}

export function AccentBannerHeader({
  name, email, phone, location, linkedin, date, recipientName, companyName
}: HeaderSnippetProps) {
  return (
    <div className="mb-8 text-gray-800">
      <div className="bg-gray-900 rounded-lg px-6 py-5 mb-4 text-white">
        <h1 className="text-3xl font-black tracking-tight mb-1">{name}</h1>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--cv-accent,#80FF00)]">
          {email && <span>{email}</span>}
          {phone && <span>{phone}</span>}
          {location && <span>{location}</span>}
        </div>
      </div>
      <div className="flex justify-between items-end border-b pb-4">
        <div className="text-sm">
          {recipientName && <p className="font-bold text-gray-900">{recipientName}</p>}
          {companyName && <p className="text-gray-600">{companyName}</p>}
        </div>
        <p className="text-xs font-bold text-gray-500">{date}</p>
      </div>
    </div>
  );
}
