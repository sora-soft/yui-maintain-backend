import {Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn} from '@sora-soft/database-component/typeorm';
import {Timestamp} from './utility/Type.js';
import {ConfigFileType} from '../../lib/Enum.js';

@Entity()
export class ConfigFile {
  constructor(data?: Partial<ConfigFile>) {
    if (!data)
      return;

    Object.entries(data).forEach(([key, value]) => {
      this[key] = value;
    });
  }

  @PrimaryColumn({
    length: 64,
  })
  name!: string;

  @Column({
    type: 'text',
  })
  context!: string;

  @Column()
  type!: ConfigFileType;

  @CreateDateColumn({
    type: 'timestamp',
  })
  createTime!: Timestamp;

  @UpdateDateColumn({
    type: 'timestamp',
  })
  updateTime!: Timestamp;
}
