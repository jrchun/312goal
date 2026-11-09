import { Doc, Section } from '../components/Doc';

/**
 * 개인정보 수집·이용 안내 (동의 화면의 "보기").
 * 정식 개인정보처리방침(위탁·국외이전·책임자 등)은 STAGE 8에서 이 화면을 확장한다.
 */
export default function Privacy() {
  return (
    <Doc title={'개인정보\n수집·이용'} updated="초안 · 2026.11 · 정식 방침은 오픈 전에 보완">
      <Section label="모으는 것">
        카카오 회원번호(로그인 식별용), 닉네임, 프로필 사진(동의한 경우), 인증 사진과 촬영 시각, 인증·찌르기·반응 기록.
        이메일·전화번호는 받지 않는다. 사진의 위치(GPS) 정보는 올리기 전에 휴대폰에서 지운다.
      </Section>
      <Section label="왜 모으나">
        로그인, 그룹 안에서 인증 기록·순위 보여주기, 찌르기와 공유 카드 만들기.
      </Section>
      <Section label="누가 보나">
        인증 사진과 기록은 같은 그룹 멤버만 본다. 인스타 공유 카드에는 본인 기록과 그룹 합계만 들어간다.
      </Section>
      <Section label="언제까지 두나">
        탈퇴하거나 그룹에서 지울 때까지. 탈퇴하면 사진과 기록을 바로 지운다.
        법으로 보관해야 하는 정보가 생기면 그 기간만 따로 보관한다.
      </Section>
      <Section label="동의 안 하면">
        동의하지 않을 수 있다. 다만 동의해야 로그인하고 서비스를 쓸 수 있다.
      </Section>
      <Section label="맡기는 곳">
        Supabase(DB·사진 저장, 서울 리전), Cloudflare(웹사이트 운영), 카카오(로그인).
      </Section>
    </Doc>
  );
}
