import {DatabaseComponent, EntityManager} from '@sora-soft/database-component';

export function transaction(component: DatabaseComponent) {
  return (target: Object, key: string, descriptor: PropertyDescriptor) => {
    const origin: Function = descriptor.value;
    const types: any[] = Reflect.getMetadata('design:paramtypes', target, key);
    const idx = types.indexOf(EntityManager);
    if (idx < 0)
      throw new TypeError(`Cannot find EntityManager parameter`);

    // tslint:disable-next-line: only-arrow-functions
    descriptor.value = async function (...args: any[]) {
      const inputManager: EntityManager = args[idx] || component.manager;
      if (!inputManager.queryRunner || !inputManager.queryRunner.isTransactionActive) {
        args[idx] = await new Promise<EntityManager>((resolve, reject) => {
          inputManager.transaction(async (manager) => {
            resolve(manager)
          }).catch(reject);
        });
      }
      return origin.apply(this, args);
    }
  }
}
