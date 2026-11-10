/** 인증 사진 (앱) — 2단계에서 expo-image-picker 로 구현. 지금은 웹만 지원 */
export type PreparedPhoto = {
  blob: Blob;
  thumb?: Blob;
  previewUrl: string;
  takenAt: Date | null;
  takenAtSource: 'exif' | 'capture' | null;
  width: number;
  height: number;
};

export async function pickPhoto(_mode: 'camera' | 'album'): Promise<File | null> {
  throw new Error('앱 사진 올리기는 2단계에서 지원');
}

export async function preparePhoto(_file: File, _mode: 'camera' | 'album' = 'album'): Promise<PreparedPhoto> {
  throw new Error('앱 사진 올리기는 2단계에서 지원');
}
