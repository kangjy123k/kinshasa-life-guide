export type BizCardLang = "zh" | "en" | "fr";

export type BizCardData = {
  logo: string;
  company: string;
  business: string;
  name: string;
  address: string;
  companyEn: string;
  businessEn: string;
  nameEn: string;
  addressEn: string;
  companyFr: string;
  businessFr: string;
  nameFr: string;
  addressFr: string;
  phone: string;
  wechat: string;
  email: string;
  showWechat?: boolean;
};

export const BIZCARD_DEFAULTS: BizCardData = {
  logo: "",
  company: "",
  business: "",
  name: "",
  address: "",
  companyEn: "",
  businessEn: "",
  nameEn: "",
  addressEn: "",
  companyFr: "",
  businessFr: "",
  nameFr: "",
  addressFr: "",
  phone: "",
  wechat: "",
  email: "",
  showWechat: true,
};
