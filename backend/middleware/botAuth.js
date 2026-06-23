// import jwt from 'jsonwebtoken';
// import User from '../models/User.js';
// import { botErr } from '../utils/botActions.js';
// const jwtSecret = () => process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

// /**
//  * אימות JWT לנתיבי בוט — תשובות בפורמט actions (לא status JSON רגיל).
//  */
// export const authenticateBot = async (req, res, next) => {
//   try {
//     const token = req.headers.authorization?.replace('Bearer ', '');
//     if (!token) {
//       return res.json(botErr('לא סופק טוקן. נדרשת הזדהות.', -2));
//     }

//     const decoded = jwt.verify(token, jwtSecret());
//     const user = await User.findById(decoded.userId);

//     if (!user || !user.isActive) {
//       return res.json(botErr('משתמש לא תקין או לא פעיל.', -2));
//     }

//     req.user = user;
//     next();
//   } catch (error) {
//     if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
//       return res.json(botErr('טוקן לא תקין או שפג תוקף.', -2));
//     }
//     return res.json(botErr('שגיאת אימות.', -2));
//   }
// };

// export const botRequireRoles = (...roles) => (req, res, next) => {
//   if (!req.user) {
//     return res.json(botErr('נדרשת הזדהות.', -2));
//   }
//   if (!roles.includes(req.user.role)) {
//     return res.json(botErr('אין הרשאה לפעולה זו.', -2));
//   }
//   next();
// };


import jwt from 'jsonwebtoken';
import { botErr } from '../utils/botActions.js';
import User from '../models/User.js';

function getBotParam(req,name){
  if(req.query?.[name]!==undefined)return req.query[name];
  if(req.body?.[name]!==undefined)return req.body[name];
  if(Array.isArray(req.body?.parameters)){
    const found=req.body.parameters.find(p=>p.name===name);
    if(found)return found.value;
  }
  return null;
}

export async function authenticateBot(req,res,next){
  try{
    const header=req.headers.authorization||'';
    const token=header.startsWith('Bearer ')
      ? header.slice(7)
      : getBotParam(req,'token');

    if(!token){
      return res.json(botErr('לא סופק טוקן. נדרשת הזדהות.',-2));
    }

    const secret=process.env.JWT_SECRET||process.env.ACCESS_TOKEN_SECRET||process.env.SECRET_KEY;
    if(!secret){
      return res.json(botErr('JWT secret missing',-1));
    }

    const decoded=jwt.verify(token,secret);
    const userId=decoded.userId||decoded.id||decoded._id;

    if(!userId){
      return res.json(botErr('טוקן לא תקין',-2));
    }

    const user=await User.findById(userId);

    if(!user){
      return res.json(botErr('משתמש לא נמצא',-2));
    }

    req.user=user.toJSON?user.toJSON():user;
    return next();
  }catch(error){
    console.error('[botAuth] error:',error);
    return res.json(botErr('טוקן לא תקין או שפג תוקפו.',-2));
  }
}

export function botRequireRoles(...roles){
  return function(req,res,next){
    const role=req.user?.role;
    if(!roles.length||roles.includes(role)){
      return next();
    }
    return res.json(botErr('אין הרשאה',-2));
  };
}