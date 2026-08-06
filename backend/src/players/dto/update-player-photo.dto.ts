import { IsString, Matches, MaxLength } from 'class-validator';

export class UpdatePlayerPhotoDto {
  @IsString()
  @MaxLength(1_500_000)
  @Matches(/^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/]+=*$/)
  photoDataUrl: string;
}
