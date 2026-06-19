import { CreateEventDto } from "./create-event.dto";
import { IsArray } from "class-validator";
import { ArrayMinSize } from "class-validator";
import { ArrayMaxSize } from "class-validator";
import { ValidateNested } from "class-validator";
import { Type } from "class-transformer";

export class CreateEventsBatchDto {
    @IsArray()
    @ArrayMinSize(1)
    @ArrayMaxSize(200) // cap batch size
    @ValidateNested({ each: true })
    @Type(() => CreateEventDto)
    events: CreateEventDto[];
}