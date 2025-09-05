// models/UserInfo.ts
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsDefined,
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

// 保持枚举不变
export enum PaymentStatus {
  PENDING = 'pending', // 待支付
  COMPLETED = 'completed', // 支付完成
  FAILED = 'failed', // 支付失败
  REFUNDED = 'refunded', // 已退款
}

export enum MembershipPlanLevel {
  Basic = 'basic',
  Vip = 'vip',
  SuperVip = 'superVip',
}

export enum MembershipPlanBillingCycle {
  Monthly = 'monthly',
  Yearly = 'yearly',
  Lifetime = 'lifetime',
}

// 1. 将 MembershipPlan 接口转换为类 (因为需要 @Type 装饰器)
//    如果你不想用类，也可以保持为接口，但在 UserInfo 中引用它时无法直接转换其内部的 Date。
//    这里为了完整性，也转换为类。
export class MembershipPlan {
  @IsDefined()
  @IsString()
  _id!: string;

  @IsDefined()
  @IsString()
  name!: string;

  @IsDefined()
  @IsEnum(MembershipPlanLevel)
  level!: MembershipPlanLevel;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDefined()
  @IsNumber()
  @Min(0)
  price!: number;

  @IsDefined()
  @IsEnum(MembershipPlanBillingCycle)
  billingCycle!: MembershipPlanBillingCycle;

  @IsDefined()
  @IsBoolean()
  isActive!: boolean;

  @IsDefined()
  // 简单数组验证，可以根据需要更严格
  features!: string[];

  @IsDefined()
  @IsNumber()
  @Min(0)
  @Max(100)
  discount!: number;

  // 关键：使用 @Type(() => Date) 将字符串转换为 Date
  // 并使用 @IsDate() 验证它是一个有效的日期
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  discountExpiresAt?: Date;
}

// 2. 将 MembershipOrder 接口转换为类
export class MembershipOrder {
  @IsDefined()
  @IsString()
  _id!: string;

  @IsDefined()
  @IsString()
  user!: string;

  @IsDefined()
  @IsString()
  membershipPlan!: string;

  @IsDefined()
  @IsString()
  billingCycle!: string; // 可以考虑用 Enum，如果后端返回固定值

  @IsDefined()
  @IsNumber()
  @Min(0)
  amount!: number;

  @IsDefined()
  @IsString()
  currency!: string;

  // 使用 Enum 验证
  @IsDefined()
  @IsEnum(PaymentStatus)
  paymentStatus!: PaymentStatus;

  @IsDefined()
  @IsString()
  paymentMethod!: string;

  @IsDefined()
  @IsString()
  transactionId!: string;

  // 关键：转换和验证日期字段
  @IsDefined()
  @IsDate()
  @Type(() => Date)
  paymentDate!: Date;

  @IsDefined()
  @IsDate()
  @Type(() => Date)
  startDate!: Date;

  @IsDefined()
  @IsDate()
  @Type(() => Date)
  endDate!: Date;

  @IsDefined()
  @IsNumber()
  @Min(0)
  @Max(100)
  discountApplied!: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsDefined()
  @IsBoolean()
  cancelled!: boolean;
}

// 3. 更新 UserInfo 类
export class UserInfo {
  @IsDefined()
  @IsString()
  _id!: string;

  @IsDefined()
  @IsString()
  @IsEmail() // class-validator 提供的专门验证邮箱的装饰器
  email!: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  photo?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  // 注意：`isVerified` 是 boolean，但你的类型是 `boolean`，装饰器用 `IsBoolean`
  // 如果 API 返回的是字符串 "true"/"false"，你可能需要自定义转换或后端修正。
  // 这里假设 API 返回的是 boolean。
  @IsOptional() // 因为是可选属性
  @IsBoolean()
  isVerified?: boolean;

  // 关键：处理嵌套对象
  // @ValidateNested 确保 vipMembershipPlan 对象本身也通过 MembershipOrder 类的验证规则
  // @Type(() => MembershipOrder) 告诉 class-transformer 如何转换这个嵌套属性
  @IsOptional()
  @ValidateNested()
  @Type(() => MembershipOrder)
  vipMembershipPlan?: MembershipOrder;

  @IsOptional()
  @ValidateNested()
  @Type(() => MembershipOrder)
  superVipMembershipPlan?: MembershipOrder;
}

// 4. 工具函数 - 现在可以安全地使用 Date 对象的方法
//    因为经过 class-transformer 转换后，startDate 和 endDate 确定是 Date 对象
export function isMembershipOrderValid(
  order: MembershipOrder | undefined,
  now: number = Date.now(), // 默认使用当前时间
): boolean {
  if (!order) return false;
  if (order.cancelled) return false;
  if (order.paymentStatus !== PaymentStatus.COMPLETED) return false;
  const startDate = new Date(order.startDate);
  const endDate = new Date(order.endDate);
  // 直接使用 getTime() 获取时间戳进行比较
  return now >= startDate.getTime() && now <= endDate.getTime();
}
