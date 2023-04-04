import {ServiceRoute} from '../../lib/route/ServiceRoute.js';
import {AssertType, ValidateClass} from '@sora-soft/type-guard';
import {HttpGatewayService} from '../service/HttpGatewayService.js';
import {ExError, Logger, Notify, Route} from '@sora-soft/framework';
import {Application} from '../Application.js';

export interface IReqRegisterClientNotify {
  session: string;
  name: string;
}

export interface IReqUnRegisterClientNotify {
  session: string;
  name: string;
}

export interface IReqNotifyToClient {
  sessions: string[];
  name: string;
  notify: unknown;
}

@ValidateClass()
class GatewayServerHandler extends ServiceRoute<HttpGatewayService> {
  @Route.method
  async registerClientNotify(@AssertType() body: IReqRegisterClientNotify) {
    await this.service.registerNotify(body.session, body.name);
    return {};
  }

  @Route.method
  async unregisterClientNotify(@AssertType() body: IReqUnRegisterClientNotify) {
    await this.service.unregisterNotify(body.session, body.name);
    return {};
  }

  @Route.notify
  async notifyToClient(@AssertType() body: IReqNotifyToClient) {
    for (const session of body.sessions) {
      const connector = this.service.avaliableConnector.get(session);
      if (!connector) {
        continue;
      }
      connector.sendNotify(new Notify({
        method: body.name,
        service: '',
        headers: {},
        payload: body.notify,
      })).catch((err: ExError) => {
        Application.appLog.warn('gateway', {event: 'send-notify-error', error: Logger.errorMessage(err)});
      });
    }
  }
}

export {GatewayServerHandler};
