import {Route} from '@sora-soft/framework';

class ServiceRoute<T> extends Route {
  constructor(service: T) {
    super();
    this.service_ = service;
  }

  protected get service() {
    return this.service_;
  }

  private service_: T;
}

export {ServiceRoute};
