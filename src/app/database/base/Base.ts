import {CreateDateColumn, UpdateDateColumn, VersionColumn} from 'typeorm';

export abstract class BaseModel {
  @UpdateDateColumn()
  updateAt: Date;

  @CreateDateColumn()
  createAt: Date;

  @VersionColumn()
  version: number;
}
