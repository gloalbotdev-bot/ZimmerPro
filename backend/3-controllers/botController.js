import axios from 'axios';
import botService from '../4-services/botService.js';
import { botOk, botErr } from '../utils/botActions.js';

async function postOutboundLead(booking, intent) {
  const url = process.env.BOT_OUTBOUND_LEAD_URL;
  if (!url) return;
  try {
    await axios.post(
      url,
      {
        type: 'booking_created',
        booking,
        searchIntent: intent || null,
        created: new Date().toISOString()
      },
      { timeout: 15000, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.warn('[bot] BOT_OUTBOUND_LEAD_URL notify failed:', e.message);
  }
}
function getBotParam(req,name,fallbackNames=[]){
  if(req.body?.[name]!==undefined)return req.body[name];
  if(req.query?.[name]!==undefined)return req.query[name];

  const names=[name,...fallbackNames];

  if(Array.isArray(req.body?.parameters)){
    const found=req.body.parameters.find(p=>names.includes(p.name));
    if(found)return found.value;
  }

  return undefined;
}

export class BotController {
  /** אימות מנהל/בעלים — מחזיר טוקן בפרמטרים (פורמט actions) */
  async adminLogin(req,res){
    try{
      const email=getBotParam(req,'email');
      const password=getBotParam(req,'password',['pass']);
  
      const data=await botService.adminLogin(email,password);
  
      return res.json(
        botOk({
          message:'התחברות הצליחה',
          token:data.token,
          user:data.user
        },0)
      );
    }catch(error){
      const msg=error.message||'התחברות נכשלה';
      const code=msg.includes('Invalid')||msg.includes('required')||msg.includes('deactivated')||msg.includes('Missing')?-2:-1;
      return res.json(botErr(msg,code));
    }
  }

  /** כל הצימרים (יחידות) לפי הרשאות המשתמש המחובר */
  async adminListUnits(req,res){
    try{
      const units=await botService.adminUnits(req.user);
  
      const statusLabels={
        available:'זמין',
        occupied:'תפוס',
        cleaning:'בניקיון',
        maintenance:'בתחזוקה'
      };
  
      const actions=[
        {
          type:'SetParameter',
          name:'count',
          value:String(units.length)
        },
        {
          type:'SendMessage',
          text:units.length
            ? `נמצאו ${units.length} צימרים:`
            : 'לא נמצאו צימרים במערכת'
        }
      ];
  
      units.slice(0,10).forEach((unit,index)=>{
        const id=unit.id||unit._id?.toString()||'';
        const name=unit.name||`צימר ${index+1}`;
        const description=unit.description||'';
        const price=unit.pricePerNight!==undefined&&unit.pricePerNight!==null
          ? `${unit.pricePerNight} ₪ ללילה`
          : 'מחיר לא הוגדר';
        const capacity=unit.capacity
          ? `עד ${unit.capacity} אורחים`
          : 'כמות אורחים לא הוגדרה';
        const region=unit.region
          ? `אזור ${unit.region}`
          : 'אזור לא הוגדר';
        const status=statusLabels[unit.status]||unit.status||'סטטוס לא הוגדר';
        const image=unit.mainImage||unit.images?.[0]||'';
  
        const subtitle=[
          price,
          capacity,
          region,
          status,
          description
        ].filter(Boolean).join(' | ');
  
        actions.push({
          type:'SendItem',
          title:name,
          subtitle,
          url:`https://zimmerspro.message.co.il`,
          image,
          options:[
            {
              type:'Command',
              text:'מחיקת צימר',
              value:`delete_unit_${id}`
            }
          ]
        });
      });
  
      if(units.length>10){
        actions.push({
          type:'SendMessage',
          text:`מוצגים 10 מתוך ${units.length} צימרים.`
        });
      }
  
      actions.push({
        type:'Return',
        value:0
      });
  
      return res.json({actions});
    }catch(error){
      return res.json(botErr(error.message||'שגיאה',-1));
    }
  }

  /** מתחמים (חשבונות) לפי הרשאות */
  async adminListAccounts(req, res) {
    try {
      const accounts = await botService.adminAccounts(req.user);
      return res.json(botOk({ accounts, count: accounts.length }, 0));
    } catch (error) {
      return res.json(botErr(error.message || 'שגיאה', -1));
    }
  }

  async adminCreateUnit(req, res) {
    try {
      const unit = await botService.adminCreateUnit(req.body || {}, req.user);
      return res.json(botOk({ message: 'הצימר נוצר', unit }, 0));
    } catch (error) {
      const code = error.message?.includes('Access') || error.message?.includes('נדרש') ? -2 : -1;
      return res.json(botErr(error.message || 'שגיאה', code));
    }
  }

  async adminDeleteUnit(req, res) {
    try {
      const result = await botService.adminDeleteUnit(req.params.id, req.user);
      return res.json(botOk({ message: result.message || 'נמחק' }, 0));
    } catch (error) {
      const code =
        error.message === 'Unit not found' ? -2 : error.message?.includes('Access') ? -2 : -1;
      return res.json(botErr(error.message || 'שגיאה', code));
    }
  }

  async adminCreateAccount(req, res) {
    try {
      const account = await botService.adminCreateAccount(req.body || {}, req.user);
      return res.json(botOk({ message: 'המתחם נוצר', account }, 0));
    } catch (error) {
      const code = error.message?.includes('Access') || error.message?.includes('חובה') ? -2 : -1;
      return res.json(botErr(error.message || 'שגיאה', code));
    }
  }

  async adminDeleteAccount(req, res) {
    try {
      const result = await botService.adminDeleteAccount(req.params.id, req.user);
      return res.json(botOk({ message: result.message || 'נמחק' }, 0));
    } catch (error) {
      const code =
        error.message === 'Account not found'
          ? -2
          : error.message?.includes('Access')
            ? -2
            : -1;
      return res.json(botErr(error.message || 'שגיאה', code));
    }
  }

  /** לקוח: טקסט חופשי → כוונה + צימרים פנויים */
  // async guestSearch(req,res){
  //   try{
  //     const text=getBotParam?getBotParam(req,'text',['search_text']):(req.body?.text||req.query?.text);
  
  //     if(!text||!String(text).trim()){
  //       return res.json(botErr('חובה לשלוח טקסט לחיפוש',-2));
  //     }
  
  //     const {intent,units}=await botService.searchUnitsByNaturalLanguage(String(text));
  
  //     const actions=[
  //       {
  //         type:'SetParameter',
  //         name:'intent',
  //         value:JSON.stringify(intent)
  //       },
  //       {
  //         type:'SetParameter',
  //         name:'count',
  //         value:String(units.length)
  //       },
  //       {
  //         type:'SendMessage',
  //         text:units.length
  //           ? `מצאתי ${units.length} צימרים שמתאימים לבקשה שלך:`
  //           : 'לא מצאתי צימרים שמתאימים לבקשה. אפשר לנסות חיפוש אחר?'
  //       }
  //     ];
  
  //     units.slice(0,10).forEach((unit)=>{
  //       actions.push({
  //         type:'SendItem',
  //         title:unit.name||'צימר',
  //         subtitle:[
  //           unit.pricePerNight?`${unit.pricePerNight} ₪ ללילה`:'',
  //           unit.capacity?`עד ${unit.capacity} אורחים`:'',
  //           unit.region?`אזור ${unit.region}`:'',
  //           unit.description||''
  //         ].filter(Boolean).join(' | '),
  //         url:'https://zimmerspro.message.co.il',
  //         image:unit.mainImage||unit.image||'',
  //         options:[
  //           {
  //             type:'Command',
  //             text:'בחר צימר זה',
  //             value:`book_unit_${unit.id}`
  //           }
  //         ]
  //       });
  //     });
  
  //     actions.push({
  //       type:'Return',
  //       value:0
  //     });
  
  //     return res.json({actions});
  //   }catch(error){
  //     return res.json(botErr(error.message||'שגיאת חיפוש',-1));
  //   }
  // }

  /** לקוח: יצירת הזמנה (שדות מפורשים) */
  // async guestBook(req, res) {
  //   try {
  //     const booking = await botService.createGuestBooking(req.body || {});
  //     await postOutboundLead(booking, req.body?.intent || null);
  //     return res.json(botOk({ message: 'ההזמנה נוצרה', booking }, 0));
  //   } catch (error) {
  //     const code = error.message?.includes('חסרים') || error.message?.includes('לא נמצא') ? -2 : -1;
  //     return res.json(botErr(error.message || 'שגיאה', code));
  //   }
  // }

  async guestSearch(req,res){
    try{
      const command=
        getBotParam(req,'command')||
        req.body?.value?.command||
        req.query?.command;
  
      if(command&&String(command).startsWith('book_unit_')){
        const unitId=String(command).replace('book_unit_','');
  
        return res.json({
          actions:[
            {
              type:'SetParameter',
              name:'unit_id',
              value:unitId
            },
            {
              type:'SendMessage',
              text:'מעולה, בחרת צימר. נמשיך ליצירת ההזמנה.'
            },
            {
              type:'Return',
              value:1
            }
          ]
        });
      }
  
      const text=getBotParam(req,'text',['search_text']);
  
      if(!text||!String(text).trim()){
        return res.json(botErr('חובה לשלוח טקסט לחיפוש',-2));
      }
  
      const {intent,units}=await botService.searchUnitsByNaturalLanguage(String(text));
  
      const actions=[
        {
          type:'SetParameter',
          name:'intent',
          value:JSON.stringify(intent)
        },
        {
          type:'SetParameter',
          name:'count',
          value:String(units.length)
        },
        {
          type:'SendMessage',
          text:units.length
            ? `מצאתי ${units.length} צימרים שמתאימים לבקשה שלך:`
            : 'לא מצאתי צימרים שמתאימים לבקשה. אפשר לנסות חיפוש אחר?'
        }
      ];
  
      units.slice(0,10).forEach((unit)=>{
        actions.push({
          type:'SendItem',
          title:unit.name||'צימר',
          subtitle:[
            unit.pricePerNight?`${unit.pricePerNight} ₪ ללילה`:'',
            unit.capacity?`עד ${unit.capacity} אורחים`:'',
            unit.region?`אזור ${unit.region}`:'',
            unit.description||''
          ].filter(Boolean).join(' | '),
          url:'https://zimmerspro.message.co.il',
          image:unit.mainImage||unit.image||'',
          options:[
            {
              type:'Command',
              text:'בחר צימר זה',
              value:`book_unit_${unit.id}`
            }
          ]
        });
      });
  
      actions.push({
        type:'Return',
        value:0
      });
  
      return res.json({actions});
    }catch(error){
      return res.json(botErr(error.message||'שגיאת חיפוש',-1));
    }
  }

  async guestBook(req,res){
    try{
      const payload={
        unitId:getBotParam(req,'unitId',['unit_id']),
        guestName:getBotParam(req,'guestName',['guest_name']),
        guestPhone:getBotParam(req,'guestPhone',['guest_phone']),
        checkIn:getBotParam(req,'checkIn',['check_in']),
        checkOut:getBotParam(req,'checkOut',['check_out']),
        totalPrice:getBotParam(req,'totalPrice',['total_price'])
      };
  
      const booking=await botService.createGuestBooking(payload);
      await postOutboundLead(booking,getBotParam(req,'intent')||null);
  
      return res.json({
        actions:[
          {
            type:'SetParameter',
            name:'booking',
            value:JSON.stringify(booking)
          },
          {
            type:'SetParameter',
            name:'booking_id',
            value:String(booking.id||booking._id||'')
          },
          {
            type:'SendMessage',
            text:'ההזמנה נוצרה בהצלחה. נציג יחזור אליך בהקדם.'
          },
          {
            type:'Return',
            value:0
          }
        ]
      });
    }catch(error){
      const code=error.message?.includes('חסרים')||error.message?.includes('לא נמצא')?-2:-1;
      return res.json(botErr(error.message||'שגיאה',code));
    }
  }

  /**
   * Webhook לקבלת ליד משליח חיצוני (בוט / Message וכו').
   * אופציונלי: ?secret= או header x-bot-secret תואם ל-BOT_WEBHOOK_SECRET
   */
  async webhookLead(req, res) {
    const expected = process.env.BOT_WEBHOOK_SECRET;
    if (expected) {
      const q = req.query?.secret;
      const h = req.headers['x-bot-secret'];
      if (q !== expected && h !== expected) {
        return res.json(botErr('לא מורשה', -2));
      }
    }
    const body = req.body || {};
    console.log('[bot] webhook lead received:', JSON.stringify(body).slice(0, 2000));
    return res.json(
      botOk(
        {
          message: 'הליד התקבל',
          leadId: body.lead?.id ?? null
        },
        0
      )
    );
  }
}

export default new BotController();
