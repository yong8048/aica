export const GOF_GROUPS = {
  creational: {
    label: "생성",
    en: "Creational",
    blurb: "객체를 만드는 시점과 방법을 호출자 밖으로 뺀다. new 뒤에 숨은 구체 클래스를 클라이언트가 몰라도 된다.",
  },
  structural: {
    label: "구조",
    en: "Structural",
    blurb: "클래스와 객체를 조립해 더 큰 구조를 만든다. 인터페이스를 맞추거나, 기능을 겹치거나, 복잡한 시스템을 가린다.",
  },
  behavioral: {
    label: "행위",
    en: "Behavioral",
    blurb: "책임을 나누고 객체끼리 대화하는 방식을 정한다. 누가 일할지, 어떤 알고리즘을 쓸지, 변화를 누구에게 알릴지.",
  },
};

export const GOF_PATTERNS = [
  {
    id: "singleton",
    group: "creational",
    ko: "싱글톤",
    en: "Singleton",
    line: "하나만 만들고, 어디서든 그 객체를 쓴다.",
    idea: "클래스 자신이 인스턴스 개수를 1개로 제한하고, 그 유일한 객체에 접근하는 길을 제공한다. 생성자는 바깥에서 마음대로 호출하지 못한다.",
    when: "설정, 로거처럼 인스턴스가 둘이면 상태가 갈라질 때.",
    cost: "숨은 전역 상태가 되기 쉽다. 테스트에서 교체하기 어렵고, 멀티스레드에서는 생성 경쟁을 막아야 한다. 정말 하나여야 할 때만 쓴다. Python에서는 __init__이 호출될 때마다 실행되므로, 초기화는 인스턴스를 처음 만들 때만 한다.",
    real: "로거, 설정 객체, 디바이스 드라이버. 스프링 기본 빈 스코프도 컨테이너 안에서 하나만 둔다.",
    code: `class AppConfig:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            obj = super().__new__(cls)
            obj.settings = {}
            cls._instance = obj
        return cls._instance

a = AppConfig()
b = AppConfig()
assert a is b`,
  },
  {
    id: "factory-method",
    group: "creational",
    ko: "팩토리 메서드",
    en: "Factory Method",
    line: "만드는 일은 자식에게 맡긴다.",
    idea: "객체를 사용하는 뼈대는 부모에 두고, 어떤 구체 클래스를 만들지는 자식이 정한다. 부모는 제품의 역할(버튼)만 알고, 윈도우 버튼인지 HTML 버튼인지는 모른다.",
    when: "처리 흐름은 같은데, 만들어질 클래스만 달라질 때.",
    cost: "제품 종류마다 자식 클래스가 늘어난다. 같이 맞춰 써야 하는 제품이 여러 개면 추상 팩토리가 맞다.",
    real: "문서 앱의 createDocument, UI 툴킷의 createButton. 프레임워크가 호출 순서를 갖고 앱이 생성만 채운다.",
    code: `class Dialog:
    def create_button(self):
        raise NotImplementedError

    def render(self):
        button = self.create_button()
        button.draw()

class WindowsDialog(Dialog):
    def create_button(self):
        return WindowsButton()

class WebDialog(Dialog):
    def create_button(self):
        return HtmlButton()`,
  },
  {
    id: "abstract-factory",
    group: "creational",
    ko: "추상 팩토리",
    en: "Abstract Factory",
    line: "같이 어울리는 세트를 한 공장에서 만든다.",
    idea: "서로 맞춰 써야 하는 제품 가족(라이트 버튼과 라이트 체크박스)을 하나의 공장 인터페이스로 만든다. 클라이언트는 공장만 받고, 구체 클래스 이름은 보지 않는다.",
    when: "테마, 플랫폼처럼 제품 여러 개가 항상 같은 가족이어야 할 때.",
    cost: "제품 종류를 하나 추가하면 모든 공장 클래스를 고쳐야 한다. 가족은 안정적이고, 가족 안 제품을 자주 추가하면 부담이 크다.",
    real: "GUI look and feel, 운영체제별 위젯 세트. JDBC에서 드라이버가 커넥션·구문·결과를 한 가족으로 내놓는 그림과 가깝다.",
    code: `class LightFactory:
    def button(self): return LightButton()
    def checkbox(self): return LightCheckbox()

class DarkFactory:
    def button(self): return DarkButton()
    def checkbox(self): return DarkCheckbox()

def build_form(factory):
    # 버튼과 체크박스가 항상 같은 테마
    return factory.button(), factory.checkbox()`,
  },
  {
    id: "builder",
    group: "creational",
    ko: "빌더",
    en: "Builder",
    line: "복잡한 객체는 단계별로 조립한다.",
    idea: "생성자 인자 나열 대신 부품을 하나씩 올리고 마지막에 build 한다. 같은 조립 단계로 다른 표현을 만들 수도 있다.",
    when: "선택 항목이 많거나, 만드는 순서가 의미 있을 때.",
    cost: "클래스와 메서드가 늘어 작은 객체에는 과하다. 인자가 둘셋이면 생성자나 함수 인자로 충분하다.",
    real: "SQL·HTTP 요청 조립, StringBuilder, 테스트 데이터 픽스처.",
    code: `class QueryBuilder:
    def select(self, *cols):
        self._select = ", ".join(cols)
        return self

    def from_(self, table):
        self._from = table
        return self

    def where(self, cond):
        self._where = cond
        return self

    def build(self):
        return (
            f"SELECT {self._select} "
            f"FROM {self._from} "
            f"WHERE {self._where}"
        )

sql = (
    QueryBuilder()
    .select("name", "email")
    .from_("users")
    .where("age > 18")
    .build()
)`,
  },
  {
    id: "prototype",
    group: "creational",
    ko: "프로토타입",
    en: "Prototype",
    line: "새로 만들지 말고, 있는 객체를 복사한다.",
    idea: "원본을 복제해 새 객체를 만든다. 생성 비용이 크거나, 런타임에 만들어진 현재 상태를 그대로 이어받고 싶을 때 맞다.",
    when: "초기화가 비싸거나, 지금 상태를 템플릿으로 찍어내고 싶을 때.",
    cost: "얕은 복사와 깊은 복사를 섞으면 복제본이 원본 상태를 같이 고친다. 순환 참조도 복제 규칙을 정해 둬야 한다.",
    real: "게임 몬스터 스폰, 문서 템플릿, JS Object.create, Python copy.deepcopy.",
    code: `import copy

class Enemy:
    def __init__(self, hp, weapon):
        self.hp = hp
        self.weapon = weapon

    def clone(self):
        return copy.deepcopy(self)

orc = Enemy(100, "axe")
spawned = orc.clone()
spawned.hp = 80
# orc.hp 는 여전히 100`,
  },
  {
    id: "adapter",
    group: "structural",
    ko: "어댑터",
    en: "Adapter",
    line: "안 맞는 인터페이스를 변환한다.",
    idea: "이미 있는 클래스(피적응자)를 고칠 수 없을 때, 클라이언트가 기대하는 인터페이스로 감싼다. 아래는 객체 어댑터다. 안쪽에 레거시 객체를 넣고 호출만 번역한다.",
    when: "남이 만든 API의 모양만 다르고, 그 코드는 수정할 수 없을 때.",
    cost: "번역 계층이 하나 더 생긴다. 클래스 어댑터는 대상과 피적응자를 동시에 상속한다. 단일 상속 언어에서는 거의 안 쓴다.",
    real: "레거시 XML API를 dict 클라이언트에 연결, 외부 결제 SDK를 사내 결제 인터페이스로 맞춤.",
    code: `class LegacyXmlApi:
    def fetch_xml(self, name):
        return f"<user name='{name}'/>"

class XmlToDictAdapter:
    def __init__(self, legacy):
        self.legacy = legacy

    def fetch_user(self, name):
        xml = self.legacy.fetch_xml(name)
        return {"name": name, "raw": xml}

api = XmlToDictAdapter(LegacyXmlApi())
api.fetch_user("ann")`,
  },
  {
    id: "bridge",
    group: "structural",
    ko: "브리지",
    en: "Bridge",
    line: "무엇과 어떻게를 분리해 각각 늘린다.",
    idea: "추상(원, 사각형)과 구현(벡터, 픽셀)을 상속 한 줄에 넣지 않고, 추상이 구현 객체를 품게 한다. 도형 2개와 렌더러 2개면 서브클래스는 4개가 아니라 2+2다.",
    when: "독립으로 늘어나는 축이 두 개라, 조합마다 클래스를 만들기 싫을 때.",
    cost: "처음부터 축을 나눠야 이득이다. 이미 어긋난 코드를 나중에 붙이는 일은 어댑터 쪽이다.",
    real: "도형과 렌더 백엔드, 원격 조종 API와 기기 구현. JDBC의 API와 드라이버 분리도 이 그림에 가깝다.",
    code: `class VectorRenderer:
    def circle(self, r):
        return f"vector {r}"

class RasterRenderer:
    def circle(self, r):
        return f"pixels {r}"

class Circle:
    def __init__(self, renderer, radius):
        self.renderer = renderer
        self.radius = radius

    def draw(self):
        return self.renderer.circle(self.radius)

Circle(VectorRenderer(), 5).draw()
Circle(RasterRenderer(), 5).draw()`,
  },
  {
    id: "composite",
    group: "structural",
    ko: "컴포지트",
    en: "Composite",
    line: "하나든 묶음이든 같은 방법으로 다룬다.",
    idea: "잎(파일)과 가지(폴더)가 같은 인터페이스를 가진다. 클라이언트는 자식이 있는지 모른 채 size()만 호출하고, 폴더는 자식들에게 같은 메시지를 넘긴다.",
    when: "부분-전체 트리를 만들고, 개별과 그룹을 구분하지 않고 처리할 때.",
    cost: "잎에는 의미 없는 연산이 생길 수 있다. 트리가 깊으면 순회 비용과 순서를 의식해야 한다.",
    real: "파일 시스템, UI 컨테이너, 조직도, 메뉴와 서브메뉴.",
    code: `class File:
    def __init__(self, size):
        self._size = size

    def size(self):
        return self._size

class Folder:
    def __init__(self, children):
        self.children = children

    def size(self):
        return sum(c.size() for c in self.children)

root = Folder([
    File(1200),
    Folder([File(800)]),
])
root.size()  # 2000`,
  },
  {
    id: "decorator",
    group: "structural",
    ko: "데코레이터",
    en: "Decorator",
    line: "포장을 겹쳐 기능을 더한다.",
    idea: "원본과 같은 인터페이스의 포장 객체가 원본을 감싸고, 자기 일을 한 뒤 안쪽으로 넘긴다. 우유와 샷처럼 조합이 런타임에 정해져도 서브클래스가 곱으로 늘지 않는다.",
    when: "기능을 선택적으로 겹치고 싶은데, 상속 조합이 폭발할 때.",
    cost: "포장이 여러 겹이면 객체 정체와 순서가 헷갈린다. 파이썬 @데코레이터 문법은 함수를 감싸는 사촌이지, 이 객체 포장 패턴 자체는 아니다.",
    real: "Java IO에서 버퍼, 압축, 암호화 스트림을 겹치는 방식. UI 스크롤과 테두리.",
    code: `class Coffee:
    def cost(self): return 3000
    def desc(self): return "커피"

class Milk:
    def __init__(self, wrapped):
        self.wrapped = wrapped
    def cost(self):
        return self.wrapped.cost() + 500
    def desc(self):
        return self.wrapped.desc() + " + 우유"

class Shot:
    def __init__(self, wrapped):
        self.wrapped = wrapped
    def cost(self):
        return self.wrapped.cost() + 700
    def desc(self):
        return self.wrapped.desc() + " + 샷"

drink = Shot(Milk(Coffee()))
# 커피 + 우유 + 샷, 4200`,
  },
  {
    id: "facade",
    group: "structural",
    ko: "퍼사드",
    en: "Facade",
    line: "복잡한 뒷문에 간단한 앞문을 단다.",
    idea: "서브시스템 여러 개의 호출 순서를 한 클래스 뒤로 모은다. 서브시스템을 못 쓰게 막는 것이 아니라, 흔한 사용법만 쉽게 만든다.",
    when: "클라이언트가 스캐너, 파서, 코드 생성기를 매번 직접 순서대로 부르고 있을 때.",
    cost: "앞문이 비대해져 신이 객체가 되기 쉽다. 인터페이스를 바꾸는 일은 어댑터, 접근을 통제하는 일은 프록시가 맡는다.",
    real: "컴파일러의 compile(), 주문 서비스가 재고·결제·배송을 한 메서드로 묶는 경우.",
    code: `class Scanner:
    def scan(self, src): return ["tokens"]

class Parser:
    def parse(self, tokens): return {"ast": True}

class CodeGen:
    def emit(self, ast): return b"bytecode"

class Compiler:
    def compile(self, src):
        tokens = Scanner().scan(src)
        ast = Parser().parse(tokens)
        return CodeGen().emit(ast)

Compiler().compile("print(1)")`,
  },
  {
    id: "flyweight",
    group: "structural",
    ko: "플라이웨이트",
    en: "Flyweight",
    line: "무거운 공통 부분은 나눠 쓰고, 다른 부분만 각자 갖는다.",
    idea: "상태를 둘로 가른다. 공유 가능한 불변 상태(메시, 텍스처)는 플라이웨이트가 갖고, 객체마다 다른 상태(좌표)는 바깥이 갖는다.",
    when: "비슷한 객체가 아주 많아 메모리가 버거울 때.",
    cost: "공유 상태를 바꾸면 그 상태를 쓰는 모두가 영향받는다. 그래서 공유분은 불변에 가깝게 둔다. 개수가 적으면 이득이 없다.",
    real: "문서 글자 글리프, 게임의 나무·총알 종류, 문자열 인턴, 정수 캐시.",
    code: `class TreeType:
    def __init__(self, name, mesh):
        self.name = name
        self.mesh = mesh

class Tree:
    def __init__(self, x, y, kind):
        self.x = x
        self.y = y
        self.kind = kind

oak = TreeType("oak", "oak.mesh")
forest = [Tree(i, i % 10, oak) for i in range(10000)]
# 메시는 1개, 좌표만 1만 개`,
  },
  {
    id: "proxy",
    group: "structural",
    ko: "프록시",
    en: "Proxy",
    line: "진짜 앞에 서서 접근을 조절한다.",
    idea: "프록시와 실제 객체는 같은 인터페이스다. 클라이언트는 둘을 구분하지 않고, 프록시가 생성 지연, 권한, 원격 호출, 캐시를 대신 처리한다.",
    when: "대상이 무겁거나, 멀리 있거나, 아무나 호출하면 안 될 때.",
    cost: "데코레이터와 모양이 비슷하다. 프록시는 접근 제어이고 대상은 보통 하나다. 기능을 더하는 일은 데코레이터다.",
    real: "이미지 지연 로딩, ORM 지연 로딩, 보호 프록시, 원격 프록시.",
    code: `class RealImage:
    def __init__(self, path):
        self.path = path  # 여기서 디스크를 읽는다

    def display(self):
        return f"show {self.path}"

class ImageProxy:
    def __init__(self, path):
        self.path = path
        self._real = None

    def display(self):
        if self._real is None:
            self._real = RealImage(self.path)
        return self._real.display()`,
  },
  {
    id: "chain",
    group: "behavioral",
    ko: "책임 연쇄",
    en: "Chain of Responsibility",
    line: "처리 못 하면 다음에게 넘긴다.",
    idea: "요청을 받는 객체가 핸들러 사슬로 연결된다. 각 핸들러는 자기가 처리할 수 있으면 처리하고, 아니면 다음에게 넘긴다. 보내는 쪽은 누가 최종 처리자인지 모른다.",
    when: "처리 후보가 여럿이고, 누가 맡을지는 요청을 봐야 알 때.",
    cost: "아무도 처리하지 않을 수 있다. 사슬이 길면 추적과 순서 보장이 어렵다. 반드시 처리돼야 하면 끝 핸들러를 둔다.",
    real: "결재선, 로깅 레벨, 서블릿 필터, UI 이벤트 버블링, HTTP 미들웨어.",
    code: `class Handler:
    def __init__(self, nxt=None):
        self.nxt = nxt

    def handle(self, amount):
        if self.can(amount):
            return self.approve(amount)
        if self.nxt:
            return self.nxt.handle(amount)
        return "거절"

class TeamLead(Handler):
    def can(self, amount): return amount <= 10
    def approve(self, amount): return "팀장 승인"

class Director(Handler):
    def can(self, amount): return amount <= 100
    def approve(self, amount): return "이사 승인"

chain = TeamLead(Director())
chain.handle(50)  # 이사 승인`,
  },
  {
    id: "command",
    group: "behavioral",
    ko: "커맨드",
    en: "Command",
    line: "할 일을 객체로 포장해 실행하고, 취소하고, 보관한다.",
    idea: "요청 자체를 객체로 만든다. 호출자는 수신자를 직접 알지 않고 execute만 부른다. 객체이므로 큐에 넣거나 로그로 남기거나 undo를 달 수 있다.",
    when: "실행을 미루거나, 실행 취소·재실행·작업 큐가 필요할 때.",
    cost: "동작마다 클래스가 생긴다. 취소가 필요 없는 한 줄 호출에는 함수 하나로 충분한 경우가 많다.",
    real: "에디터 undo/redo, 작업 큐, GUI 메뉴 동작, 트랜잭션 로그.",
    code: `class Player:
    def __init__(self):
        self.x = 0

class Move:
    def __init__(self, player, dx):
        self.player = player
        self.dx = dx

    def execute(self):
        self.player.x += self.dx

    def undo(self):
        self.player.x -= self.dx

history = []
player = Player()
cmd = Move(player, 5)
cmd.execute()
history.append(cmd)
history.pop().undo()`,
  },
  {
    id: "iterator",
    group: "behavioral",
    ko: "이터레이터",
    en: "Iterator",
    line: "속을 보여주지 않고 하나씩 꺼낸다.",
    idea: "컬렉션의 표현과 순회를 분리한다. 클라이언트는 다음 원소만 받고, 안이 리스트인지 트리는 몰라도 된다.",
    when: "내부 구조를 숨긴 채 차례로 방문하고 싶을 때.",
    cost: "오늘날 언어가 for-in 으로 흡수한 패턴이다. 직접 짤 일은 커스텀 순회가 필요할 때로 줄었다. 순회 중 컬렉션을 고치면 깨진다.",
    real: "Python __iter__, Java Iterator, 트리의 전위·후위 순회.",
    code: `class Playlist:
    def __init__(self, songs):
        self._songs = songs

    def __iter__(self):
        for song in self._songs:
            yield song

for title in Playlist(["a", "b", "c"]):
    play(title)`,
  },
  {
    id: "mediator",
    group: "behavioral",
    ko: "미디에이터",
    en: "Mediator",
    line: "서로 직접 말하지 않고 사회자를 통한다.",
    idea: "동료 객체가 서로를 참조하면 거미줄이 된다. 변경 알림을 중재자에게만 보내고, 중재자가 누구를 켤지 정한다.",
    when: "위젯이나 동료 객체가 서로를 직접 알며 얽혀 있을 때.",
    cost: "중재자가 모든 규칙을 삼키면 다시 거대한 클래스가 된다. 규칙은 사회자에게 모으되, 동료의 고유 동작은 동료에게 남긴다.",
    real: "대화상자, 채팅방, 항공 관제, 폼에서 약관 동의 전 로그인 버튼 비활성.",
    code: `class Dialog:
    def __init__(self):
        self.terms_on = False
        self.login_enabled = False

    def notify(self, sender):
        if sender == "terms":
            self.login_enabled = self.terms_on

dialog = Dialog()

def toggle_terms():
    dialog.terms_on = not dialog.terms_on
    dialog.notify("terms")`,
  },
  {
    id: "memento",
    group: "behavioral",
    ko: "메멘토",
    en: "Memento",
    line: "그때의 상태를 사진으로 남긴다.",
    idea: "원조자가 자기 상태의 스냅샷을 만들고, 관리자는 그 내용을 해석하지 않은 채 보관만 한다. 되돌릴 때는 스냅샷을 원조자에게 돌려준다.",
    when: "캡슐화를 깨지 않고 저장·복원이 필요할 때.",
    cost: "스냅샷이 크면 메모리를 많이 쓴다. 동작의 역연산으로 충분한 undo는 커맨드가 더 가볍다.",
    real: "에디터 체크포인트, 게임 세이브, 트랜잭션 롤백용 스냅샷.",
    code: `class Editor:
    def __init__(self):
        self.text = ""

    def save(self):
        return self.text

    def restore(self, snap):
        self.text = snap

history = []
ed = Editor()
ed.text = "안녕"
history.append(ed.save())
ed.text = "안녕 세상"
ed.restore(history.pop())  # "안녕"`,
  },
  {
    id: "observer",
    group: "behavioral",
    ko: "옵저버",
    en: "Observer",
    line: "바뀌면 구독자에게 알린다.",
    idea: "주제가 구독자 목록을 갖고, 상태가 바뀌면 등록된 관찰자에게 통지한다. 주제는 구독자가 화면인지 로그인지 자세히 몰라도 된다. 일대다 의존이다.",
    when: "한 변경에 여러 대상이 반응해야 하고, 그 대상을 미리 고정하기 싫을 때.",
    cost: "알림 순서가 암묵적이면 버그가 난다. 구독 해제를 빼먹으면 죽은 객체가 남고, 통지 도중 목록을 고치면 순회가 깨진다.",
    real: "이벤트 리스너, MVC에서 모델 변경 후 뷰 갱신, 메시지 구독.",
    code: `class PriceStore:
    def __init__(self):
        self.price = 0
        self._subs = []

    def subscribe(self, fn):
        self._subs.append(fn)

    def set_price(self, price):
        self.price = price
        for fn in self._subs:
            fn(price)

store = PriceStore()
store.subscribe(lambda p: print("화면", p))
store.subscribe(lambda p: print("알림", p))
store.set_price(1200)`,
  },
  {
    id: "state",
    group: "behavioral",
    ko: "상태",
    en: "State",
    line: "지금 상태가 곧 행동이다.",
    idea: "상태마다 클래스를 두고, 컨텍스트는 현재 상태 객체에게 일을 위임한다. 분기가 커진 if/else 대신, 상태 객체가 다음 상태로의 전이까지 안다.",
    when: "객체의 행동이 상태 값에 따라 크게 갈리고, 그 분기가 계속 커질 때.",
    cost: "상태 수가 적으면 클래스만 늘어 손해다. 구조는 전략과 비슷하지만, 전략은 외부에서 알고리즘을 고르고 전이가 없다.",
    real: "주문 상태, 미디어 재생, TCP 연결, 문서 초안과 게시.",
    code: `class Draft:
    def publish(self, doc):
        doc.state = Review()
        return "검토 요청"

class Review:
    def publish(self, doc):
        doc.state = Published()
        return "게시"

class Published:
    def publish(self, doc):
        return "이미 게시됨"

class Document:
    def __init__(self):
        self.state = Draft()

    def publish(self):
        return self.state.publish(self)`,
  },
  {
    id: "strategy",
    group: "behavioral",
    ko: "전략",
    en: "Strategy",
    line: "계산법을 바꿔 끼운다.",
    idea: "알고리즘 가족을 같은 인터페이스 뒤에 두고, 컨텍스트는 그 인터페이스만 호출한다. 요금 정책은 생성 시 주입하므로 컨텍스트 코드는 안 바뀐다.",
    when: "같은 일에 알고리즘만 갈아 끼우고, 조건문으로 분기하기 싫을 때.",
    cost: "클라이언트가 전략 차이를 어느 정도 알아야 고를 수 있다. 호출이 한 줄이고 교체가 없으면 함수 인자로 충분하다.",
    real: "정렬 비교자, 결제·할인·경로 탐색, 압축 알고리즘 교체.",
    code: `class Regular:
    def fare(self, km):
        return 1000 + km * 500

class Night:
    def fare(self, km):
        return int((1000 + km * 500) * 1.3)

class Taxi:
    def __init__(self, pricing):
        self.pricing = pricing

    def charge(self, km):
        return self.pricing.fare(km)

Taxi(Regular()).charge(3)
Taxi(Night()).charge(3)`,
  },
  {
    id: "template-method",
    group: "behavioral",
    ko: "템플릿 메서드",
    en: "Template Method",
    line: "순서는 고정하고, 빈칸만 자식이 채운다.",
    idea: "부모의 템플릿 메서드가 알고리즘 골격을 호출 순서로 고정한다. 달라지는 단계만 열어 두고 자식이 구현한다. 부모가 자식의 빈칸을 부르는 할리우드 원칙이다.",
    when: "처리 순서는 같고 중간 단계의 내용만 다를 때.",
    cost: "상속이라 자식이 부모 골격에 묶인다. 알고리즘 전체를 런타임에 바꾸고 싶으면 전략이 맞다.",
    real: "데이터 처리의 열기-추출-분석-닫기, 프레임워크 라이프사이클, 테스트 setUp과 tearDown.",
    code: `class DataMiner:
    def mine(self, path):
        raw = self.open(path)
        data = self.extract(raw)
        self.analyze(data)
        self.close(raw)

    def analyze(self, data):
        return len(data)

class CsvMiner(DataMiner):
    def open(self, path): return path
    def extract(self, raw): return ["행"]
    def close(self, raw): return None`,
  },
  {
    id: "visitor",
    group: "behavioral",
    ko: "비지터",
    en: "Visitor",
    line: "구조는 그대로 두고, 새 작업을 방문시킨다.",
    idea: "원소는 accept로 방문자를 맞이하고, 실제 연산은 방문자 쪽에 있다. 평가와 출력을 원소 클래스에 계속 넣지 않고 방문자 클래스로 추가한다.",
    when: "객체 구조는 안정적인데, 그 위에 연산을 자주 추가할 때.",
    cost: "원소 타입을 새로 넣으면 모든 방문자를 고쳐야 한다. 구조가 자주 변하면 손해고, 연산이 자주 늘면 이득이다.",
    real: "AST 순회(타입 검사, 포맷, 코드 생성), 컴파일러 패스.",
    code: `class Number:
    def __init__(self, value):
        self.value = value
    def accept(self, visitor):
        return visitor.visit_number(self)

class Add:
    def __init__(self, left, right):
        self.left = left
        self.right = right
    def accept(self, visitor):
        return visitor.visit_add(self)

class Eval:
    def visit_number(self, node):
        return node.value
    def visit_add(self, node):
        return node.left.accept(self) + node.right.accept(self)

expr = Add(Number(1), Number(2))
expr.accept(Eval())  # 3`,
  },
  {
    id: "interpreter",
    group: "behavioral",
    ko: "인터프리터",
    en: "Interpreter",
    line: "문법 규칙을 클래스로 만들어 문장을 실행한다.",
    idea: "문법의 규칙마다 클래스를 둔다. 숫자 같은 터미널은 값을 내고, 덧셈·곱셈 같은 논터미널은 자식 식을 해석한 뒤 자기 규칙을 적용한다. 문장은 그 객체 트리다.",
    when: "문법이 작고, 그 언어의 문장을 자주 실행할 때.",
    cost: "문법 규칙마다 클래스가 생긴다. 문법이 커지면 파서 생성기를 쓰는 편이 낫다. GoF 중 실무 빈도가 가장 낮다.",
    real: "작은 수식, 검색 조건, 간단한 규칙 엔진.",
    code: `class Num:
    def __init__(self, value):
        self.value = value
    def eval(self):
        return self.value

class Add:
    def __init__(self, left, right):
        self.left = left
        self.right = right
    def eval(self):
        return self.left.eval() + self.right.eval()

class Mul:
    def __init__(self, left, right):
        self.left = left
        self.right = right
    def eval(self):
        return self.left.eval() * self.right.eval()

# (1 + 2) * 3
Mul(Add(Num(1), Num(2)), Num(3)).eval()  # 9`,
  },
];

export const GOF_EXAM = {
  singleton:
    "( )는 어떤 클래스의 인스턴스가 프로그램에서 오직 하나만 만들어지도록 보장하고, 그 인스턴스에 대한 전역 접근점을 제공하는 생성 패턴이다.",
  "factory-method":
    "( )는 객체 생성의 책임을 서브클래스에 두어, 상위 클래스는 생성 인터페이스만 정의하고 실제로 어떤 클래스를 생성할지는 하위 클래스가 결정하게 하는 생성 패턴이다. Virtual Constructor라고도 불린다.",
  "abstract-factory":
    "( )는 서로 관련 있는 여러 객체(제품군)를 생성하기 위한 인터페이스를 제공하는 생성 패턴으로, Kit이라고도 불린다. 이 패턴을 사용하면 구체적인 클래스를 지정하지 않고도 연관된 제품군 전체를 한 번에 변경할 수 있다.",
  builder:
    "( )는 복잡한 객체의 생성 과정과 표현 방법을 분리하여, 같은 생성 절차로 서로 다른 표현의 객체를 만들 수 있게 하는 생성 패턴이다.",
  prototype:
    "( )는 원형이 되는 객체를 복제하여 새로운 객체를 생성하는 생성 패턴이다. 생성할 객체의 클래스를 지정하지 않고, 이미 있는 인스턴스를 복사하여 만든다.",
  adapter:
    "( )는 호환되지 않는 인터페이스를 가진 클래스들이 함께 동작할 수 있도록, 기존 클래스(Adaptee)를 클라이언트가 기대하는 인터페이스(Target)로 변환하는 구조 패턴이다. 기존 클래스를 감싸서 인터페이스를 바꾸며, Wrapper라고도 불린다.",
  bridge:
    "( )는 기능의 클래스 계층과 구현의 클래스 계층을 분리하여 연결하고, 두 계층을 독립적으로 확장할 수 있게 하는 구조 패턴이다. Handle/Body라고도 불린다.",
  composite:
    "( )는 객체들을 트리 구조로 구성하여 부분-전체 계층을 표현하고, 개별 객체와 복합 객체를 같은 방법으로 다룰 수 있게 하는 구조 패턴이다.",
  decorator:
    "( )는 객체에 동적으로 책임을 추가할 수 있게 하는 구조 패턴이다. 기능을 확장하려고 서브클래스를 늘리는 것보다 유연하며, Wrapper라고도 불린다.",
  facade:
    "( )는 복잡한 하위 시스템의 여러 인터페이스를 하나의 단순한 통합 인터페이스로 제공하는 구조 패턴이다. 클라이언트는 하위 시스템을 직접 호출하지 않고 이 창구만 사용한다.",
  flyweight:
    "( )는 공유를 이용하여 많은 수의 작은 객체를 효율적으로 지원하는 구조 패턴이다. 여러 객체가 공통으로 갖는 상태는 공유하고, 객체마다 다른 상태는 외부에 둔다.",
  proxy:
    "( )는 어떤 객체에 대한 접근을 제어하기 위해 그 객체의 대리 객체를 두는 구조 패턴이다. 실제 객체에 접근하기 전에 필요한 작업을 수행할 수 있고, 실제 객체의 생성을 지연시켜 자원을 아낄 수 있으며, Surrogate라고도 불린다.",
  chain:
    "( )는 요청을 처리할 수 있는 객체들을 사슬로 연결하고, 처리할 객체를 만날 때까지 사슬을 따라 요청을 넘기는 행위 패턴이다. 요청을 보내는 쪽은 최종 처리자가 누구인지 알 필요가 없다.",
  command:
    "( )는 요청 자체를 객체로 캡슐화하여 요청에 필요한 정보와 수행 동작을 함께 가지게 하는 행위 패턴이다. 요청을 저장하거나 실행을 취소할 수 있으며, Action 또는 Transaction이라고도 불린다.",
  iterator:
    "( )는 컬렉션 객체의 내부 구조를 노출하지 않고 원소에 순차적으로 접근할 수 있게 하는 행위 패턴이다. 반복 과정을 캡슐화하여 클라이언트가 컬렉션의 구현에 의존하지 않게 하며, Cursor라고도 불린다.",
  mediator:
    "( )는 객체들이 서로 직접 참조하지 않고 중재 객체를 통해서만 상호작용하게 하여, 객체 사이의 결합도를 낮추는 행위 패턴이다.",
  memento:
    "( )는 객체의 캡슐화를 위반하지 않으면서 내부 상태를 저장해 두었다가 나중에 그 상태로 복원할 수 있게 하는 행위 패턴이다. Token이라고도 불린다.",
  observer:
    "( )는 한 객체의 상태가 바뀌면 그 객체에 의존하는 다른 객체들에게 자동으로 통지하여 갱신하게 하는 행위 패턴이다. 일대다 의존 관계를 정의하며, Publish-Subscribe라고도 불린다.",
  state:
    "( )는 객체의 내부 상태에 따라 객체의 행동이 바뀌도록 하는 행위 패턴이다. 마치 객체가 자신의 클래스를 바꾸는 것처럼 보이며, 상태에 따른 조건 분기를 상태 객체로 대체한다.",
  strategy:
    "( )는 동일 계열의 알고리즘군을 정의하고 각각을 캡슐화하여 서로 교환해서 사용할 수 있게 하는 행위 패턴이다. 알고리즘이 클라이언트와 독립적으로 바뀔 수 있으며, Policy라고도 불린다.",
  "template-method":
    "( )는 알고리즘의 골격은 상위 클래스에 정의하고, 일부 단계는 하위 클래스에서 구현하도록 하는 행위 패턴이다. 알고리즘의 구조는 바꾸지 않고 특정 단계만 재정의할 수 있다.",
  visitor:
    "( )는 객체 구조를 변경하지 않고 그 구조를 이루는 원소들에 수행할 새로운 연산을 추가할 수 있게 하는 행위 패턴이다. 연산을 담은 객체가 원소들을 방문하며 작업을 수행한다.",
  interpreter:
    "( )는 주어진 언어의 문법을 클래스로 나타내고, 그 문법에 맞는 문장을 해석하는 행위 패턴이다. 문법이 단순한 언어를 정의하고 그 문장을 실행할 때 사용한다.",
};

export const GOF_PAIRS = [
  {
    ask: "제품을 몇 개 만드나",
    a: ["팩토리 메서드", "하나. 자식이 클래스를 고른다."],
    b: ["추상 팩토리", "같이 맞아야 하는 제품 묶음."],
  },
  {
    ask: "나중에 맞추나, 미리 나누나",
    a: ["어댑터", "이미 있는 인터페이스를 변환한다."],
    b: ["브리지", "처음부터 추상과 구현을 두 축으로 둔다."],
  },
  {
    ask: "감싸는 이유가 뭔가",
    a: ["데코레이터", "기능을 겹쳐 더한다."],
    b: ["프록시", "접근을 지연·제한·대신한다. 대상은 보통 하나."],
  },
  {
    ask: "앞문을 왜 두나",
    a: ["퍼사드", "여러 서브시스템을 단순한 입구로 모은다."],
    b: ["어댑터", "인터페이스 하나의 모양을 바꾼다."],
  },
  {
    ask: "트리인가, 포장인가",
    a: ["컴포지트", "자식이 여러 개. 부분과 전체가 같다."],
    b: ["데코레이터", "안쪽은 보통 하나. 기능을 더한다."],
  },
  {
    ask: "무엇을 바꾸나",
    a: ["전략", "알고리즘. 상태 전이는 없다."],
    b: ["상태", "현재 모드. 다음 상태로 넘어간다."],
  },
  {
    ask: "교체를 어떻게 하나",
    a: ["전략", "합성. 런타임에 끼운다."],
    b: ["템플릿 메서드", "상속. 순서는 부모가 고정한다."],
  },
  {
    ask: "누구를 아나",
    a: ["옵저버", "발행자는 구독자에게 알리기만 한다."],
    b: ["미디에이터", "동료가 사회자를 통해 서로를 조율한다."],
  },
  {
    ask: "무엇을 저장하나",
    a: ["커맨드", "동작. 실행과 취소."],
    b: ["메멘토", "상태 스냅샷. 통째로 복원."],
  },
];

export const GOF_NOTES = [
  {
    title: "감싸는 네 이름",
    paragraphs: [
      "어댑터, 퍼사드, 프록시, 데코레이터는 모두 뭔가의 앞에 선다. 어댑터는 번역기다. 클라이언트가 원하는 말과 이미 있는 객체의 말이 다를 때 그 사이에 둔다. 퍼사드는 안내 창구다. 뒤에 있는 여러 시스템을 한 번의 호출로 묶는다.",
      "프록시와 데코레이터는 인터페이스가 대상과 같다. 프록시는 진짜 객체 대신 접근을 관리한다. 아직 불러오지 않기, 권한 검사, 원격 호출, 캐시. 데코레이터는 같은 인터페이스 위에 일을 더한다. 커피에 우유를 얹고 다시 샷을 얹듯이 여러 겹이 자연스럽다.",
    ],
  },
  {
    title: "행동을 바꾸는 세 이름",
    paragraphs: [
      "전략은 계산법의 교체다. 택시는 그대로 두고 일반 요금과 야간 요금을 바꿔 끼운다. 요금 객체가 다음 요금제로 전이하지는 않는다. 고르는 쪽은 클라이언트다.",
      "상태는 모드의 교체다. 초안 문서는 게시를 누르면 검토가 되고, 검토는 게시됨이 된다. 같은 publish()라도 지금 상태 객체가 결과와 다음 상태를 정한다.",
      "템플릿 메서드는 순서의 고정이다. 열고, 추출하고, 분석하고, 닫는 흐름은 부모에 있다. 자식은 추출처럼 빈칸만 구현한다. 순서를 통째로 바꾸고 싶으면 전략으로 돌아간다.",
    ],
  },
  {
    title: "알림과 저장",
    paragraphs: [
      "옵저버는 방송이다. 가격이 바뀌면 화면과 알림이 각자 반응하고, 가격 저장소는 그 둘의 내부를 모른다. 미디에이터는 조율이다. 약관 체크가 로그인 버튼을 직접 켜지 않고, 대화상자가 허용 여부를 결정한다.",
      "커맨드는 한 일의 기록이다. 오른쪽으로 5칸 이동은 실행과 반대 실행을 가진 객체다. 메멘토는 그 순간의 사진이다. 글자 전체를 저장해 두었다가 그대로 덮어쓴다. 역연산을 만들기 쉬우면 커맨드, 상태 전부를 되돌리는 편이 안전하면 메멘토다.",
    ],
  },
];
