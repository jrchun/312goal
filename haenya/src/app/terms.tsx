import { Doc, Section } from '../components/Doc';

/** 이용약관 (동의 화면의 "보기"). 정식 약관은 STAGE 8에서 보완 */
export default function Terms() {
  return (
    <Doc title="이용약관" updated="초안 · 2026.11 · 정식 약관은 오픈 전에 보완">
      <Section label="이 서비스는">
        친구끼리 운동 인증을 올리고, 안 한 친구를 찔러서 서로 자극하는 무료 서비스다. 만 14세 이상만 쓸 수 있다.
      </Section>
      <Section label="올리면 안 되는 것">
        남의 사진, 다른 사람이 나오는 사진을 그 사람 동의 없이 올리기. 음란·폭력적인 사진. 남을 비하하거나 괴롭히는 내용.
        지키지 않으면 사진을 지우거나 이용을 막을 수 있다.
      </Section>
      <Section label="사진의 권리">
        올린 사진의 권리는 올린 사람에게 있다. 서비스는 그룹 안에 보여주고 공유 카드를 만드는 데만 쓴다.
      </Section>
      <Section label="탈퇴">
        언제든 설정에서 탈퇴할 수 있다. 탈퇴하면 기록과 사진이 지워지고 되돌릴 수 없다.
      </Section>
      <Section label="책임">
        운동 중 다치는 일은 서비스가 책임지지 않는다. 무리하지 말자.
      </Section>
    </Doc>
  );
}
