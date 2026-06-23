import axios from 'axios';
import unitRepository from '../5-repositories/unitRepository.js';
import bookingRepository from '../5-repositories/bookingRepository.js';
import authService from './authService.js';
import unitService from './unitService.js';
import accountService from './accountService.js';

const REGIONS = ['צפון', 'דרום', 'מרכז', 'השפלה'];

function addDays(isoDate, days) {
  const d = new Date(`${isoDate}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function nightsBetween(checkIn, checkOut) {
  const a = new Date(`${checkIn}T12:00:00`);
  const b = new Date(`${checkOut}T12:00:00`);
  const n = Math.round((b - a) / (24 * 60 * 60 * 1000));
  return Math.max(1, n);
}

function bookingsOverlap(b, checkIn, checkOut) {
  return b.checkIn < checkOut && b.checkOut > checkIn;
}

/** ניתוח טקסט חופשי (גיבוי כשאין מפתח Gemini) */
// function heuristicParse(text, todayIso) {
//   const t = (text || '').trim();
//   const lower = t.toLowerCase();
//   let region = null;
//   for (const r of REGIONS) {
//     if (t.includes(r)) {
//       region = r;
//       break;
//     }
//   }
//   if (!region && (lower.includes('north') || lower.includes('galilee'))) region = 'צפון';
//   if (!region && (lower.includes('south') || lower.includes('negev'))) region = 'דרום';
//   if (!region && (lower.includes('center') || lower.includes('tel aviv'))) region = 'מרכז';

//   let nights = 1;
//   const mNights = t.match(/(\d+)\s*(לילות?|nights?)/i);
//   if (mNights) nights = Math.max(1, parseInt(mNights[1], 10));

//   const mGuests = t.match(/(\d+)\s*(אורחים?|אנשים?|guests?|people)/i);
//   const minGuests = mGuests ? Math.max(1, parseInt(mGuests[1], 10)) : 1;

//   const checkIn = addDays(todayIso, 1);
//   const checkOut = addDays(checkIn, nights);
//   return { checkIn, checkOut, region, minGuests, source: 'heuristic' };
// }

function heuristicParse(text,todayIso){
  const t=(text||'').trim();
  const lower=t.toLowerCase();

  let region=null;
  for(const r of REGIONS){
    if(t.includes(r)){
      region=r;
      break;
    }
  }

  if(!region&&(lower.includes('north')||lower.includes('galilee')||lower.includes('גליל')||lower.includes('גולן')||lower.includes('כנרת')))region='צפון';
  if(!region&&(lower.includes('south')||lower.includes('negev')||lower.includes('אילת')||lower.includes('נגב')))region='דרום';
  if(!region&&(lower.includes('center')||lower.includes('tel aviv')||lower.includes('תל אביב')||lower.includes('מרכז')))region='מרכז';
  if(!region&&(lower.includes('שפלה')||lower.includes('רחובות')||lower.includes('נס ציונה')))region='השפלה';

  let nights=1;
  const mNights=t.match(/(\d+)\s*(לילות?|לילה|nights?)/i);
  if(mNights)nights=Math.max(1,parseInt(mNights[1],10));

  let minGuests=1;
  const mGuests=t.match(/(\d+)\s*(אורחים?|אנשים?|נפשות|guests?|people)/i);
  if(mGuests)minGuests=Math.max(1,parseInt(mGuests[1],10));

  let maxPrice=null;
  const mPrice=t.match(/(?:עד|מקסימום|max|budget)\s*(\d{2,6})/i);
  if(mPrice)maxPrice=Math.max(0,parseInt(mPrice[1],10));

  const checkIn=addDays(todayIso,1);
  const checkOut=addDays(checkIn,nights);

  return {
    checkIn,
    checkOut,
    nights,
    region,
    minGuests,
    maxPrice,
    keywords:t,
    source:'heuristic'
  };
}

async function geminiParseIntent(text,todayIso){
  const key=process.env.GEMINI_API_KEY||process.env.BOT_GEMINI_API_KEY;
  if(!key||!text?.trim())return null;

  const prompt=`You extract zimmer / vacation rental search parameters from Hebrew or English text.
Today is ${todayIso}.
Return ONLY valid JSON, no markdown.

Schema:
{
  "checkIn":"YYYY-MM-DD",
  "checkOut":"YYYY-MM-DD",
  "nights":number,
  "region":null or one of ["צפון","דרום","מרכז","השפלה"],
  "minGuests":number,
  "maxPrice":null or number,
  "keywords":string
}

Rules:
- If the user says "N nights" or "N לילות", calculate checkOut from checkIn.
- If check-in is missing, use tomorrow.
- Map areas to Hebrew enum:
  north/galilee/golan/כנרת/גליל => צפון
  south/negev/eilat => דרום
  center/tel aviv => מרכז
  שפלה/רחובות/נס ציונה => השפלה
- minGuests maps to the Unit.capacity field.
- maxPrice maps to Unit.pricePerNight.
- keywords should contain useful search words from the user request.`;

  const url=`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(key)}`;

  const {data}=await axios.post(
    url,
    {
      contents:[
        {
          role:'user',
          parts:[
            {
              text:`${prompt}\n\nUser: ${text}`
            }
          ]
        }
      ],
      generationConfig:{
        temperature:0.1,
        maxOutputTokens:300
      }
    },
    {
      timeout:20000
    }
  );

  const raw=data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if(!raw)return null;

  const cleaned=raw.replace(/```json\n?|\n?```/g,'').trim();
  const parsed=JSON.parse(cleaned);

  if(!parsed.checkIn||!parsed.checkOut)return null;

  return {
    checkIn:parsed.checkIn,
    checkOut:parsed.checkOut,
    nights:Math.max(1,Number(parsed.nights)||nightsBetween(parsed.checkIn,parsed.checkOut)),
    region:parsed.region||null,
    minGuests:Math.max(1,Number(parsed.minGuests)||1),
    maxPrice:parsed.maxPrice===null||parsed.maxPrice===undefined?null:Number(parsed.maxPrice),
    keywords:parsed.keywords||text,
    source:'gemini'
  };
}

export class BotService {
  async adminLogin(email, password) {
    const result = await authService.login(email, password);
    return {
      token: result.token,
      user: result.user
    };
  }

  async adminUnits(user) {
    return unitService.getAllUnits(user);
  }

  async adminAccounts(user) {
    return accountService.getAllAccounts(user);
  }

  async adminCreateUnit(body, user) {
    return unitService.createUnit(body, user);
  }

  async adminDeleteUnit(id, user) {
    return unitService.deleteUnit(id, user);
  }

  async adminCreateAccount(body, user) {
    return accountService.createAccount(body, user);
  }

  async adminDeleteAccount(id, user) {
    return accountService.deleteAccount(id, user);
  }

  /**
   * חיפוש צימרים לפי טקסט חופשי (Gemini + ניתוח גיבוי).
   */
  async searchUnitsByNaturalLanguage(text){
    const todayIso=new Date().toISOString().slice(0,10);
  
    let intent;
    try{
      intent=await geminiParseIntent(text,todayIso);
    }catch(error){
      console.warn('[bot search] Gemini parse failed:',error.message);
      intent=null;
    }
  
    if(!intent){
      intent=heuristicParse(text,todayIso);
    }
  
    const allUnits=(await unitRepository.findAll({})).map((u)=>u.toJSON());
    const bookings=await bookingRepository.findAll({});
  
    let matches=allUnits.filter((unit)=>{
      return unit.status==='available';
    });
  
    if(intent.region){
      matches=matches.filter((unit)=>{
        return unit.region===intent.region;
      });
    }
  
    if(intent.minGuests&&intent.minGuests>1){
      matches=matches.filter((unit)=>{
        return Number(unit.capacity||0)>=Number(intent.minGuests);
      });
    }
  
    if(intent.maxPrice&&Number.isFinite(intent.maxPrice)){
      matches=matches.filter((unit)=>{
        return Number(unit.pricePerNight||0)<=Number(intent.maxPrice);
      });
    }
  
    const available=matches.filter((unit)=>{
      const unitId=unit.id||unit._id?.toString();
      const unitBookings=bookings.filter((booking)=>{
        const bookingUnitId=booking.unitId?.toString?.()||String(booking.unitId);
        return bookingUnitId===unitId&&booking.status!=='cancelled';
      });
  
      return !unitBookings.some((booking)=>{
        return bookingsOverlap(booking,intent.checkIn,intent.checkOut);
      });
    });
  
    const formattedUnits=available.map((unit)=>{
      return {
        id:unit.id,
        name:unit.name,
        description:unit.description||'',
        pricePerNight:unit.pricePerNight,
        capacity:unit.capacity,
        status:unit.status,
        region:unit.region,
        image:unit.mainImage||unit.images?.[0]||null,
        mainImage:unit.mainImage||unit.images?.[0]||null,
        images:unit.images||[],
        videoUrl:unit.videoUrl||'',
        specialPrices:unit.specialPrices||[]
      };
    });
  
    return {
      intent,
      units:formattedUnits
    };
  }

  /**
   * יצירת הזמנה (לקוח בוט) — ללא סנכרון יומן (אין משתמש מחובר).
   */
  async createGuestBooking(payload) {
    const {
      unitId,
      guestName,
      guestPhone,
      checkIn,
      checkOut,
      totalPrice: totalPriceIn
    } = payload;

    if (!unitId || !guestName || !guestPhone || !checkIn || !checkOut) {
      throw new Error('חסרים שדות חובה: unitId, guestName, guestPhone, checkIn, checkOut');
    }

    const unit = await unitRepository.findById(unitId);
    if (!unit) {
      throw new Error('הצימר לא נמצא');
    }

    const nights = nightsBetween(checkIn, checkOut);
    const totalPrice =
      totalPriceIn !== undefined && totalPriceIn !== null && totalPriceIn !== ''
        ? Number(totalPriceIn)
        : nights * (unit.pricePerNight || 0);

    const booking = await bookingRepository.create({
      unitId: unit._id.toString(),
      guestName: String(guestName).trim(),
      guestPhone: String(guestPhone).trim(),
      checkIn,
      checkOut,
      totalPrice: Number.isFinite(totalPrice) ? totalPrice : 0,
      status: 'pending'
    });

    return booking.toJSON();
  }
}

export default new BotService();
