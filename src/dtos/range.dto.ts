import { IsNotEmpty, IsOptional } from 'class-validator';

export class DateRangeDto {
  @IsNotEmpty({ message: 'La fecha "from" es obligatoria' })
  from: Date;

  @IsOptional()
  to?: Date;

  @IsOptional()
  temas?: Array<string>;
}
