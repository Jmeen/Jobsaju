const SALT = "saju-secure-salt-2026";

export function encodeSecurePayload(payload) {
  try {
    const jsonStr = JSON.stringify(payload);
    const encodedStr = encodeURIComponent(jsonStr);
    let xorStr = '';
    for (let i = 0; i < encodedStr.length; i++) {
      xorStr += String.fromCharCode(encodedStr.charCodeAt(i) ^ SALT.charCodeAt(i % SALT.length));
    }
    return typeof btoa !== 'undefined' ? btoa(xorStr) : Buffer.from(xorStr, 'latin1').toString('base64');
  } catch(e) {
    return null;
  }
}

export function decodeSecurePayload(encodedPayload) {
  try {
    const xorStr = typeof atob !== 'undefined' ? atob(encodedPayload) : Buffer.from(encodedPayload, 'base64').toString('latin1');
    let decodedStr = '';
    for (let i = 0; i < xorStr.length; i++) {
      decodedStr += String.fromCharCode(xorStr.charCodeAt(i) ^ SALT.charCodeAt(i % SALT.length));
    }
    return JSON.parse(decodeURIComponent(decodedStr));
  } catch(e) {
    return null;
  }
}
