import { Route, Service } from '@sora-soft/framework'
import { AuthGroupId, GuestGroupId } from '../../app/account/AccountType'
import { AccountWorld } from '../../app/account/AccountWorld'
import { UserErrorCode } from '../../app/ErrorCode'
import {IRestfulReq} from '../../app/handler/RestfulHandler'
import { UserError } from '../../app/UserError'
import { AuthRPCHeader } from '../Const'

class AuthRoute<T extends Service = Service> extends Route {
  static auth(authName?: string) {
    return (target: AuthRoute, method: string) => {
      target.registerMiddleware<AuthRoute>(method, async (route, body, request, response, connector) => {
        const checkAuthName = [route.service.name, authName || method].join('/');

        const gid = request.getHeader<AuthGroupId>(AuthRPCHeader.RPC_AUTH_GID);
        if (gid) {
          if (gid === GuestGroupId) {
            throw new UserError(UserErrorCode.ERR_NOT_LOGIN, 'ERR_NOT_LOGIN');
          }
          const allowed = await AccountWorld.hasAuth(gid, checkAuthName)
          if (!allowed) {
            throw new UserError(UserErrorCode.ERR_AUTH_DENY, `ERR_AUTH_DENY, name=${checkAuthName}`)
          }
        } else {
          throw new UserError(UserErrorCode.ERR_NOT_LOGIN, 'ERR_NOT_LOGIN');
        }
        return true
      })
    }
  }

  static logined(target: AuthRoute, method: string) {
    target.registerMiddleware(method, async (route, body, request, response, connector) => {
      const gid = request.getHeader<AuthGroupId>(AuthRPCHeader.RPC_AUTH_GID)
      if (!gid || gid === GuestGroupId) {
        throw new UserError(UserErrorCode.ERR_NOT_LOGIN, 'ERR_NOT_LOGIN')
      }
      return true
    })
  }

  static restful(authName?: string) {
    return (target: AuthRoute, method: string) => {
      target.registerMiddleware<AuthRoute>(method, async (route, body: IRestfulReq, request) => {
        const db = body.db;
        const checkAuthName = [route.service.name, authName || method, db].join('/');

        const gid = request.getHeader<AuthGroupId>(AuthRPCHeader.RPC_AUTH_GID);
        if (gid) {
          if (gid === GuestGroupId) {
            throw new UserError(UserErrorCode.ERR_NOT_LOGIN, 'ERR_NOT_LOGIN');
          }
          const allowed = await AccountWorld.hasAuth(gid, checkAuthName)
          if (!allowed) {
            throw new UserError(UserErrorCode.ERR_AUTH_DENY, `ERR_AUTH_DENY, name=${checkAuthName}`)
          }
        } else {
          throw new UserError(UserErrorCode.ERR_NOT_LOGIN, 'ERR_NOT_LOGIN');
        }
        return true
      })
    }
  }

  constructor(service: T) {
    super()
    this.service_ = service
  }

  get service() {
    return this.service_
  }

  private service_: T
}

export { AuthRoute }
