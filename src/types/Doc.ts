export default interface Doc {
  id: number;
  name: string;
  fileType: string;
  extension: string;
  uploader?: {
    id: number;
    nickname: string;
  };
  profile?: {
    id: number;
    nickname: string;
  };
  uploadId?: number;
  upload?: {
    id: number;
    name: string;
  };
  createdAt?: string;
}
