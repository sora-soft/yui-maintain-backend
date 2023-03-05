export interface IEmailTemplate {
  subject: string;
  bodyHtml: string;
}

export const ForgetPasswordEmail =(code: string): IEmailTemplate => {
  return {
    subject: '重置密码请求',
    bodyHtml: `您本次重置密码请求的验证码为：<b>${code}</b>`
  };
};
