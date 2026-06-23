
import React from 'react';
import { translations, Language } from '../translations';
import { 
  Smartphone, Share2, Server, Bot, MessageSquare, Terminal, Copy, Check, ExternalLink, 
  ArrowRight, ShieldCheck, Zap, Code
} from 'lucide-react';
import { AppState } from '../types';

interface Props {
  db: AppState;
  lang: Language;
}

const IntegrationsPage: React.FC<Props> = ({ db, lang }) => {
  const t = translations[lang];
  const [copied, setCopied] = React.useState(false);

  const webhookCode = `
// Example Node.js Webhook for WhatsApp & Gemini
const express = require('express');
const { GoogleGenAI } = require("@google/genai");
const axios = require('axios');

const app = express().use(express.json());
const ai = new GoogleGenAI({ apiKey: "YOUR_GEMINI_API_KEY" });

app.post('/webhook', async (req, res) => {
  const message = req.body.entry[0].changes[0].value.messages[0];
  const from = message.from; // Guest Phone
  const text = message.text.body;

  // 1. Process with Gemini
  const result = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: text,
    config: { systemInstruction: "You are the ZimmerPro booking bot..." }
  });

  // 2. Reply back to WhatsApp
  await axios.post(\`https://graph.facebook.com/v17.0/YOUR_PHONE_ID/messages\`, {
    messaging_product: "whatsapp",
    to: from,
    text: { body: result.text }
  }, { headers: { Authorization: "Bearer YOUR_ACCESS_TOKEN" } });

  res.sendStatus(200);
});

app.listen(3000, () => console.log('WhatsApp Bot is LIVE!'));
  `;

  const copyCode = () => {
    navigator.clipboard.writeText(webhookCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-10 animate-fadeIn max-w-6xl mx-auto">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium">
           <Zap size={14} />
           חיבור WhatsApp
        </div>
        <h2 className="text-2xl font-bold text-slate-800">חיבור הבוט לוואטסאפ</h2>
        <p className="text-slate-500 max-w-2xl mx-auto text-sm">קישור בין Gemini ל-WhatsApp Business API.</p>
      </div>

      {/* Integration Steps Flow */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
         <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 -z-10 hidden md:block"></div>
         
         {[
           { icon: Smartphone, title: 'WhatsApp Business', desc: 'פתחו חשבון ב-Meta for Developers' },
           { icon: Server, title: 'Deploy Server', desc: 'העלו שרת Node.js שמקבל הודעות' },
           { icon: Bot, title: 'Gemini', desc: 'חיבור API של גוגל' },
           { icon: ShieldCheck, title: 'הפעלה', desc: 'הבוט עונה לאורחים בוואטסאפ' }
         ].map((step, i) => (
           <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col items-center text-center space-y-4 group hover:scale-105 transition-all">
              <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-xl group-hover:rotate-6 transition-all">
                <step.icon size={28} />
              </div>
              <h4 className="font-black text-slate-800">{step.title}</h4>
              <p className="text-xs text-slate-400 font-bold leading-relaxed">{step.desc}</p>
           </div>
         ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
         {/* Instruction Content */}
         <div className="lg:col-span-7 space-y-8">
            <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-6">
               <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                    <Code size={20} />
                  </div>
                  קוד Webhook (צד שרת)
               </h3>
               <p className="text-sm text-slate-500 font-medium">
                  זהו הקוד הבסיסי שאתה צריך להריץ על השרת שלך. הוא מקבל הודעה מהאורח בווצאפ, שולח אותה ל-Gemini, ומחזיר את התשובה לאורח.
               </p>
               
               <div className="relative group">
                  <pre className="bg-slate-900 text-slate-300 p-6 rounded-3xl text-[11px] font-mono overflow-x-auto leading-relaxed custom-scrollbar h-[350px]">
                    {webhookCode}
                  </pre>
                  <button 
                    onClick={copyCode}
                    className="absolute top-4 left-4 p-3 bg-white/10 hover:bg-white/20 text-white rounded-xl backdrop-blur-md transition-all flex items-center gap-2"
                  >
                    {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                    <span className="text-[10px] font-bold uppercase">{copied ? 'Copied!' : 'Copy Code'}</span>
                  </button>
               </div>
            </div>
         </div>

         {/* Sidebar with settings links */}
         <div className="lg:col-span-5 space-y-6">
            <div className="bg-slate-900 text-white p-8 rounded-[3rem] shadow-2xl space-y-6">
               <div className="flex items-center gap-3">
                  <Share2 className="text-indigo-400" />
                  <h4 className="text-lg font-black tracking-tight">קישורים שימושיים</h4>
               </div>
               
               <div className="space-y-3">
                  <a href="https://developers.facebook.com/" target="_blank" className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-all group">
                     <span className="text-sm font-bold">Meta for Developers</span>
                     <ExternalLink size={16} className="text-white/40 group-hover:text-white" />
                  </a>
                  <a href="https://ai.google.dev/" target="_blank" className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-all group">
                     <span className="text-sm font-bold">Gemini API Dashboard</span>
                     <ExternalLink size={16} className="text-white/40 group-hover:text-white" />
                  </a>
                  <a href="https://dashboard.ngrok.com/" target="_blank" className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-all group">
                     <span className="text-sm font-bold">Ngrok (for local testing)</span>
                     <ExternalLink size={16} className="text-white/40 group-hover:text-white" />
                  </a>
               </div>

               <div className="p-5 bg-indigo-600 rounded-2xl">
                  <h5 className="text-xs font-black uppercase mb-2">צריך עזרה בהטמעה?</h5>
                  <p className="text-[11px] leading-relaxed font-bold opacity-80">
                    הצוות הטכני שלנו יכול לחבר עבורך את הבוט לשרת תוך פחות מ-24 שעות. צור קשר עם התמיכה.
                  </p>
               </div>
            </div>

            <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
               <h4 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
                 <Terminal size={16} className="text-slate-400" />
                 דרישות קדם (Prerequisites)
               </h4>
               <ul className="space-y-3">
                  {[
                    'חשבון Meta Business מאומת',
                    'שרת עם תעודת SSL (HTTPS)',
                    'Gemini API Key פעיל',
                    'מספר טלפון ייעודי לבוט'
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-xs font-bold text-slate-500">
                       <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                       {item}
                    </li>
                  ))}
               </ul>
            </div>
         </div>
      </div>
    </div>
  );
};

export default IntegrationsPage;
