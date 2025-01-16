import CryptoJS from "crypto-js";
import forge from "node-forge";
const iv = "0102030405060708";
const presetKey = "0CoJUm6Qyw8W8jud";
const linuxapiKey = "rFgB&h#%2?^eDg:Q";
const base62 = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const publicKey = `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDgtQn2JZ34ZC28NWYpAUd98iZ37BUrX/aKzmFbt7clFSs6sXqHauqKWqdtLkF2KexO40H1YTX8z2lSgBBOAxLsvaklV8k4cBFK9snQXE9/DDaFt6Rr7iVZMldczhC0JNgTz+SHXT6CBHuX3e9SdB1Ua44oncaTWz7OBGLbCiK45wIDAQAB
-----END PUBLIC KEY-----`;
const eapiKey = "e82ckenh8dichen8";

const aesEncrypt = (
  text: string,
  mode: keyof typeof CryptoJS.mode,
  key: string,
  iv: string,
  format = "base64"
) => {
  let encrypted = CryptoJS.AES.encrypt(
    CryptoJS.enc.Utf8.parse(text),
    CryptoJS.enc.Utf8.parse(key),
    {
      iv: CryptoJS.enc.Utf8.parse(iv),
      mode: CryptoJS.mode[mode],
      padding: CryptoJS.pad.Pkcs7,
    }
  );
  if (format === "base64") {
    return encrypted.toString();
  }

  return encrypted.ciphertext.toString().toUpperCase();
};
const aesDecrypt = (
  ciphertext: string,
  key: string,
  iv: string,
  format = "base64"
) => {
  let bytes;
  if (format === "base64") {
    bytes = CryptoJS.AES.decrypt(ciphertext, CryptoJS.enc.Utf8.parse(key), {
      iv: CryptoJS.enc.Utf8.parse(iv),
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7,
    });
  } else {
    bytes = CryptoJS.AES.decrypt(ciphertext, CryptoJS.enc.Utf8.parse(key), {
      iv: CryptoJS.enc.Utf8.parse(iv),
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7,
    });
  }
  return bytes.toString(CryptoJS.enc.Utf8);
};
const rsaEncrypt = (str: string, key: string) => {
  const forgePublicKey = forge.pki.publicKeyFromPem(key);
  const encrypted = forgePublicKey.encrypt(str, "NONE");
  return forge.util.bytesToHex(encrypted);
};

const weapi = (object: Object) => {
  const text = JSON.stringify(object);
  let secretKey = "";
  for (let i = 0; i < 16; i++) {
    secretKey += base62.charAt(Math.round(Math.random() * 61));
  }
  return {
    params: aesEncrypt(
      aesEncrypt(text, "CBC", presetKey, iv),
      "CBC",
      secretKey,
      iv
    ),
    encSecKey: rsaEncrypt(secretKey.split("").reverse().join(""), publicKey),
  };
};

const linuxapi = (object: Object) => {
  const text = JSON.stringify(object);
  return {
    eparams: aesEncrypt(text, "ECB", linuxapiKey, "", "hex"),
  };
};

const eapi = (url: string, object: Object) => {
  const text = typeof object === "object" ? JSON.stringify(object) : object;
  const message = `nobody${url}use${text}md5forencrypt`;
  const digest = CryptoJS.MD5(message).toString();
  const data = `${url}-36cd479b6b5-${text}-36cd479b6b5-${digest}`;
  return {
    params: aesEncrypt(data, "ECB", eapiKey, "", "hex"),
  };
};
const eapiResDecrypt = (encryptedParams: string) => {
  // 使用aesDecrypt解密参数
  const decryptedData = aesDecrypt(encryptedParams, eapiKey, "", "hex");
  return JSON.parse(decryptedData);
};
const eapiReqDecrypt = (encryptedParams: string) => {
  // 使用aesDecrypt解密参数
  const decryptedData = aesDecrypt(encryptedParams, eapiKey, "", "hex");
  // 使用正则表达式解析出URL和数据
  const match = decryptedData.match(/(.*?)-36cd479b6b5-(.*?)-36cd479b6b5-(.*)/);
  if (match) {
    const url = match[1];
    const data = JSON.parse(match[2]);
    return { url, data };
  }

  // 如果没有匹配到，返回null
  return null;
};
const decrypt = (cipher: string) => {
  const decipher = CryptoJS.AES.decrypt(cipher, eapiKey, {
    mode: CryptoJS.mode.ECB,
  });
  const decryptedBytes = CryptoJS.enc.Utf8.stringify(decipher);
  return decryptedBytes;
};

export default {
  weapi,
  linuxapi,
  eapi,
  decrypt,
  aesEncrypt,
  aesDecrypt,
  eapiReqDecrypt,
  eapiResDecrypt,
};
