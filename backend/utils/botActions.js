/**
 * פורמט תשובה תואם בוטים (למשל Message) — מערך actions עם SetParameter ו-Return.
 * Return: 0 הצלחה, -1 שגיאה כללית, -2 ולידציה / אימות
 */

export function botActions(actions) {
  return { actions };
}

export function botOk(params = {}, returnValue = 0) {
  const actions = [];
  for (const [name, value] of Object.entries(params)) {
    let v = value;
    if (v !== null && typeof v === 'object') {
      v = JSON.stringify(v);
    } else if (v !== undefined && typeof v !== 'string' && typeof v !== 'number' && typeof v !== 'boolean') {
      v = String(v);
    }
    actions.push({ type: 'SetParameter', name, value: v });
  }
  actions.push({ type: 'Return', value: returnValue });
  return { actions };
}

export function botErr(message, code = -1) {
  return {
    actions: [
      { type: 'SetParameter', name: 'message', value: message },
      { type: 'Return', value: code }
    ]
  };
}
