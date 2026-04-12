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
    <div className="mb-8 border-b-2 border-gray-800 pb-6 text-gray-800">
      <div className="flex flex-col items-center justify-center text-center">
        <h1 className="text-3xl font-serif font-bold uppercase tracking-widest mb-2">{name}</h1>
        <div className="flex flex-wrap justify-center gap-2 text-sm font-serif">
          {email && <span>{email}</span>}
          {phone && <><span className="text-gray-400">•</span><span>{phone}</span></>}
          {location && <><span className="text-gray-400">•</span><span>{location}</span></>}
          {linkedin && <><span className="text-gray-400">•</span><span>{linkedin}</span></>}
        </div>
      </div>
      
      <div className="mt-8 flex flex-col items-start font-serif text-sm">
        <p>{date}</p>
        <div className="mt-4">
          {recipientName && <p>{recipientName}</p>}
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
    <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center text-gray-800 border-l-4 border-lime-500 pl-6 py-2">
      <div className="flex flex-col">
        <h1 className="text-4xl font-sans font-black tracking-tighter mb-1">{name}</h1>
        <div className="text-sm font-sans text-gray-500 space-y-0.5">
          {recipientName && <p className="font-semibold text-gray-700 mt-4">To: {recipientName}</p>}
          {companyName && <p>{companyName}</p>}
          <p className="mt-1">{date}</p>
        </div>
      </div>
      
      <div className="mt-6 md:mt-0 flex flex-col items-start md:items-end text-sm font-sans text-gray-600 space-y-1">
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
    <div className="mb-10 text-gray-800">
      <h1 className="text-2xl font-sans font-semibold mb-6">{name}</h1>
      <div className="flex flex-col space-y-1 text-sm text-gray-600 mb-8">
        {email && <p>{email}</p>}
        {phone && <p>{phone}</p>}
        {location && <p>{location}</p>}
      </div>
      
      <div className="text-sm">
        <p className="mb-4">{date}</p>
        {recipientName && <p>{recipientName}</p>}
        {companyName && <p>{companyName}</p>}
      </div>
    </div>
  );
}
