type Request = (
  uri: String,
  data: Object,
  options: {
    crypto?: string;
    cookie?: string;
    ua?: string;
    proxy?: string;
    realIP?: string;
    e_r?: string;
  }
) => Promise<{ status: number; body: Object; cookie: String[] }>;

declare module "NeteaseCloudMusicApi/module/search" {
  export default function search(
    query: { keyword: String },
    request: Request
  ): Promise<{ status: number; body: Object; cookie: String[] }>;
}
declare module "NeteaseCloudMusicApi/util/request" {
  const request: Request;
  export { request };
  export default request;
}
