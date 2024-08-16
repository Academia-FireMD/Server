import { IsNumber, IsOptional, IsString } from 'class-validator';

export class PaginationDto {
  @IsNumber({}, { message: 'Debes pasar un numero valido a la propiedad skip' })
  skip: number;

  @IsNumber({}, { message: 'Debes pasar un numero valido a la propiedad take' })
  take: number;

  @IsOptional()
  @IsString({ message: 'Debes ingresar un texto para realizar la busqueda' })
  searchTerm: string;

  @IsOptional()
  @IsNumber(
    {},
    { message: 'Debes pasar un numero valido a la propiedad totalRegisters' },
  )
  totalRegisters: number;
}
