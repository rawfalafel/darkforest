pragma solidity ^0.5.0;
library Pairing {
    struct G1Point {
        uint X;
        uint Y;
    }
    // Encoding of field elements is: X[0] * z + X[1]
    struct G2Point {
        uint[2] X;
        uint[2] Y;
    }
    /// @return the generator of G1
    function P1() internal pure returns (G1Point memory) {
        return G1Point(1, 2);
    }
    /// @return the generator of G2
    function P2() internal pure returns (G2Point memory) {
        // Original code point
        return G2Point(
            [11559732032986387107991004021392285783925812861821192530917403151452391805634,
             10857046999023057135944570762232829481370756359578518086990519993285655852781],
            [4082367875863433681332203403145435568316851327593401208105741076214120093531,
             8495653923123431417604973247489272438418190587263600148770280649306958101930]
        );
    }
    /// @return the negation of p, i.e. p.addition(p.negate()) should be zero.
    function negate(G1Point memory p) internal pure returns (G1Point memory) {
        // The prime q in the base field F_q for G1
        uint q = 21888242871839275222246405745257275088696311157297823662689037894645226208583;
        if (p.X == 0 && p.Y == 0)
            return G1Point(0, 0);
        return G1Point(p.X, q - (p.Y % q));
    }
    /// @return the sum of two points of G1
    function addition(G1Point memory p1, G1Point memory p2)  internal view returns (G1Point memory r) {
        uint[4] memory input;
        input[0] = p1.X;
        input[1] = p1.Y;
        input[2] = p2.X;
        input[3] = p2.Y;
        bool success;
        // solium-disable-next-line security/no-inline-assembly
        assembly {
            success := staticcall(sub(gas, 2000), 6, input, 0xc0, r, 0x60)
            // Use "invalid" to make gas estimation work
            switch success case 0 { invalid() }
        }
        require(success,"pairing-add-failed");
    }
    /// @return the product of a point on G1 and a scalar, i.e.
    /// p == p.scalar_mul(1) and p.addition(p) == p.scalar_mul(2) for all points p.
    function scalar_mul(G1Point memory p, uint s) internal view returns (G1Point memory r) {
        uint[3] memory input;
        input[0] = p.X;
        input[1] = p.Y;
        input[2] = s;
        bool success;
        // solium-disable-next-line security/no-inline-assembly
        assembly {
            success := staticcall(sub(gas, 2000), 7, input, 0x80, r, 0x60)
            // Use "invalid" to make gas estimation work
            switch success case 0 { invalid() }
        }
        require (success,"pairing-mul-failed");
    }
    /// @return the result of computing the pairing check
    /// e(p1[0], p2[0]) *  .... * e(p1[n], p2[n]) == 1
    /// For example pairing([P1(), P1().negate()], [P2(), P2()]) should
    /// return true.
    function pairing(G1Point[] memory p1, G2Point[] memory p2) internal view returns (bool) {
        require(p1.length == p2.length,"pairing-lengths-failed");
        uint elements = p1.length;
        uint inputSize = elements * 6;
        uint[] memory input = new uint[](inputSize);
        for (uint i = 0; i < elements; i++)
        {
            input[i * 6 + 0] = p1[i].X;
            input[i * 6 + 1] = p1[i].Y;
            input[i * 6 + 2] = p2[i].X[0];
            input[i * 6 + 3] = p2[i].X[1];
            input[i * 6 + 4] = p2[i].Y[0];
            input[i * 6 + 5] = p2[i].Y[1];
        }
        uint[1] memory out;
        bool success;
        // solium-disable-next-line security/no-inline-assembly
        assembly {
            success := staticcall(sub(gas, 2000), 8, add(input, 0x20), mul(inputSize, 0x20), out, 0x20)
            // Use "invalid" to make gas estimation work
            switch success case 0 { invalid() }
        }
        require(success,"pairing-opcode-failed");
        return out[0] != 0;
    }
    /// Convenience method for a pairing check for two pairs.
    function pairingProd2(G1Point memory a1, G2Point memory a2, G1Point memory b1, G2Point memory b2) internal view returns (bool) {
        G1Point[] memory p1 = new G1Point[](2);
        G2Point[] memory p2 = new G2Point[](2);
        p1[0] = a1;
        p1[1] = b1;
        p2[0] = a2;
        p2[1] = b2;
        return pairing(p1, p2);
    }
    /// Convenience method for a pairing check for three pairs.
    function pairingProd3(
            G1Point memory a1, G2Point memory a2,
            G1Point memory b1, G2Point memory b2,
            G1Point memory c1, G2Point memory c2
    ) internal view returns (bool) {
        G1Point[] memory p1 = new G1Point[](3);
        G2Point[] memory p2 = new G2Point[](3);
        p1[0] = a1;
        p1[1] = b1;
        p1[2] = c1;
        p2[0] = a2;
        p2[1] = b2;
        p2[2] = c2;
        return pairing(p1, p2);
    }
    /// Convenience method for a pairing check for four pairs.
    function pairingProd4(
            G1Point memory a1, G2Point memory a2,
            G1Point memory b1, G2Point memory b2,
            G1Point memory c1, G2Point memory c2,
            G1Point memory d1, G2Point memory d2
    ) internal view returns (bool) {
        G1Point[] memory p1 = new G1Point[](4);
        G2Point[] memory p2 = new G2Point[](4);
        p1[0] = a1;
        p1[1] = b1;
        p1[2] = c1;
        p1[3] = d1;
        p2[0] = a2;
        p2[1] = b2;
        p2[2] = c2;
        p2[3] = d2;
        return pairing(p1, p2);
    }
}
contract Verifier {
    using Pairing for *;
    struct VerifyingKey {
        Pairing.G2Point A;
        Pairing.G1Point B;
        Pairing.G2Point C;
        Pairing.G2Point gamma;
        Pairing.G1Point gammaBeta1;
        Pairing.G2Point gammaBeta2;
        Pairing.G2Point Z;
        Pairing.G1Point[] IC;
    }
    struct Proof {
        Pairing.G1Point A;
        Pairing.G1Point A_p;
        Pairing.G2Point B;
        Pairing.G1Point B_p;
        Pairing.G1Point C;
        Pairing.G1Point C_p;
        Pairing.G1Point K;
        Pairing.G1Point H;
    }
    function initVerifyingKey() internal pure returns (VerifyingKey memory vk) {
        vk.A = Pairing.G2Point([11743972570740101293748484606271612727115261715650260982966433626727037099058,2824345745687628089190740072376691585519417324343371098468657020366000178017], [6567617309366176372998220508602065433484363631725665298695008563793132205205,2794867095147315906081924152591956812293348500680843051899201800199942516637]);
        vk.B = Pairing.G1Point(3411859955479754706435650033881381090280759177798186165371857916337086350225,21506290794280320960430319234834893208919101842541467064421769779216742488144);
        vk.C = Pairing.G2Point([4115087660865548139237191154071121203728010166718647755099250976237588580873,12867476335327352626030553766519861755150093449496350222691504966693557703464], [3587315376576079816679169865807556227313538273459115317708980372355668517889,1083509019716094398438047979654011713874833605019200538445124324353241795472]);
        vk.gamma = Pairing.G2Point([6543919352536381536922197838321832271028011415829807591995262262123840065570,5885616850825890330325280100155970827538088570450978129067337871127003003848], [13809805817782079087660476240546693067068869420331239371518569891349818816544,2180186645765646066334606059372668572106800296518068389005761512701637831287]);
        vk.gammaBeta1 = Pairing.G1Point(18794677806482704780689618245841590611264394084145161335885426162116208830246,3402869345851395998844263870633594887150954543510772991562228107585527831108);
        vk.gammaBeta2 = Pairing.G2Point([14907724186655509958385469839397682245371293988825953621643362666685852756432,11859211376089094300606437771180973082141517175427347497386382096918601764367], [20340753248905754859983170234953151135478383307204376501148234127806628297577,18419434545998814404131970476407211947865386316351104786765562617707728374182]);
        vk.Z = Pairing.G2Point([9359237357928771015985307013577500494601909660329286503610152789979271307361,11983571369255634214200268957447091232989732826397071974632662594433840897255], [1749487005181773075027674407677795124907934773719080591118079175368544928651,21130443607178088981051855261371636997277410216775761169597458528191342893862]);
        vk.IC = new Pairing.G1Point[](2);
        vk.IC[0] = Pairing.G1Point(3376746068977946782853491862606003743729191603174515906248152741406989563473,14446946312377903327659064632110528920409013716518935560292483643732065977067);
        vk.IC[1] = Pairing.G1Point(13956419211629689511671183739747790616471948305350389301405305316621764830294,12446602388920126857544803182091069656152578549124330544146574644068201772775);
    }
    function moveVerifyingKey() internal pure returns (VerifyingKey memory vk) {
        vk.A = Pairing.G2Point([7270903587781134369787533639841602953097461901662773085669175634206828099676,14910689651322983725448410797010800308294007312309872186646791528906943300326], [1902456131873435740015151490847272906953991295619192532485913917692521561474,10406770619230021582123384101175418143615657603050414387591929836757759973810]);
        vk.B = Pairing.G1Point(20210019551948698206852209665571561749744852717847896773318786274244985079917,19302474389431103434770940684216700485117371269403354745800017365172277474413);
        vk.C = Pairing.G2Point([9268052294235388868246791909005652845229863780067736410619148600270495012474,3242317607946184492130892413079067585124010193636832858404809069749899841567], [18148825237881329043139063133362082272301686065043405470875280970492670791817,9046997694723158459402766766441135986430060080755194513789873561074266628020]);
        vk.gamma = Pairing.G2Point([20481318925334372669501919879336599373022738913616731014063232898802930404828,12762276968994703851672092964745394416720651813484966173339290681931130907380], [17654711852721106746597120994564793331684847098404353886309224043151362331197,10215016543725743630767197869437349389559022690945420353992991865984176884328]);
        vk.gammaBeta1 = Pairing.G1Point(1524235090878353407418240050233849863744342199470875113879054578911799834390,5488969591476105886219061229221671718406964716961334462315558820703148535515);
        vk.gammaBeta2 = Pairing.G2Point([16904695823915897544256955618602958727643271705192278911178960917659565483189,978886596369244683598285922768540866181117073133205260317103936718404524429], [1757933975924695748424889520721333346943534659255537136082545668759213975220,1812307793574487683893447533516748354540564552205010218455275197429001310996]);
        vk.Z = Pairing.G2Point([19907904917306235871342064197648341022131807956876060132914926198147345638660,6944351638211474256369050345206444026085454040393106742490143155330298250804], [14311919898263681573600456997979218031472376244721532037408290134289988842023,4967610600414725860868747480733972404641079715144726774320371212969283416919]);
        vk.IC = new Pairing.G1Point[](4);
        vk.IC[0] = Pairing.G1Point(11677297031676484299025965075841980746773593991432612086906175989012955258178,7108506967553626022053732004886381049291676332332323558456276373373988863300);
        vk.IC[1] = Pairing.G1Point(19455375277390162084409893057814672679526100713860039957705236702417961995544,16329782372760282454081221694565274078068292410840587406616766434031229717486);
        vk.IC[2] = Pairing.G1Point(12457522807102348566433627336474987246254713691493773662331353342958302542595,5107295460668246965911055810556009478387833640877681721249621409037111123642);
        vk.IC[3] = Pairing.G1Point(2512955224439797249634173555533195752970375874104129428378756084530692190089,2263669579070019871664221508159030822386785727194155649268307809353318692919);
    }
    function verify(uint[] memory input, Proof memory proof, VerifyingKey memory vk) internal view returns (uint) {
        uint256 snark_scalar_field = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
        require(input.length + 1 == vk.IC.length,"verifier-bad-input");
        // Compute the linear combination vk_x
        Pairing.G1Point memory vk_x = Pairing.G1Point(0, 0);
        for (uint i = 0; i < input.length; i++) {
            require(input[i] < snark_scalar_field,"verifier-gte-snark-scalar-field");
            vk_x = Pairing.addition(vk_x, Pairing.scalar_mul(vk.IC[i + 1], input[i]));
        }
        vk_x = Pairing.addition(vk_x, vk.IC[0]);
        if (!Pairing.pairingProd2(proof.A, vk.A, Pairing.negate(proof.A_p), Pairing.P2())) return 1;
        if (!Pairing.pairingProd2(vk.B, proof.B, Pairing.negate(proof.B_p), Pairing.P2())) return 2;
        if (!Pairing.pairingProd2(proof.C, vk.C, Pairing.negate(proof.C_p), Pairing.P2())) return 3;
        if (!Pairing.pairingProd3(
            proof.K, vk.gamma,
            Pairing.negate(Pairing.addition(vk_x, Pairing.addition(proof.A, proof.C))), vk.gammaBeta2,
            Pairing.negate(vk.gammaBeta1), proof.B
        )) return 4;
        if (!Pairing.pairingProd3(
                Pairing.addition(vk_x, proof.A), proof.B,
                Pairing.negate(proof.H), vk.Z,
                Pairing.negate(proof.C), Pairing.P2()
        )) return 5;
        return 0;
    }
    function verifyProof(
            uint[2] memory a,
            uint[2] memory a_p,
            uint[2][2] memory b,
            uint[2] memory b_p,
            uint[2] memory c,
            uint[2] memory c_p,
            uint[2] memory h,
            uint[2] memory k,
            uint[] memory input,
            VerifyingKey memory vk
        ) internal view returns (bool) {
        Proof memory proof;
        proof.A = Pairing.G1Point(a[0], a[1]);
        proof.A_p = Pairing.G1Point(a_p[0], a_p[1]);
        proof.B = Pairing.G2Point([b[0][0], b[0][1]], [b[1][0], b[1][1]]);
        proof.B_p = Pairing.G1Point(b_p[0], b_p[1]);
        proof.C = Pairing.G1Point(c[0], c[1]);
        proof.C_p = Pairing.G1Point(c_p[0], c_p[1]);
        proof.H = Pairing.G1Point(h[0], h[1]);
        proof.K = Pairing.G1Point(k[0], k[1]);
        if (verify(input, proof, vk) == 0) {
            return true;
        } else {
            return false;
        }
    }
    function verifyInitProof(
            uint[2] memory a,
            uint[2] memory a_p,
            uint[2][2] memory b,
            uint[2] memory b_p,
            uint[2] memory c,
            uint[2] memory c_p,
            uint[2] memory h,
            uint[2] memory k,
            uint[1] memory input
        ) view public returns (bool) {
        uint[] memory inputValues = new uint[](input.length);
        for(uint i = 0; i < input.length; i++){
            inputValues[i] = input[i];
        }
        return verifyProof(a, a_p, b, b_p, c, c_p, h, k, inputValues, initVerifyingKey());
    }
    function verifyMoveProof(
            uint[2] memory a,
            uint[2] memory a_p,
            uint[2][2] memory b,
            uint[2] memory b_p,
            uint[2] memory c,
            uint[2] memory c_p,
            uint[2] memory h,
            uint[2] memory k,
            uint[3] memory input
        ) view public returns (bool) {
        uint[] memory inputValues = new uint[](input.length);
        for(uint i = 0; i < input.length; i++){
            inputValues[i] = input[i];
        }
        return verifyProof(a, a_p, b, b_p, c, c_p, h, k, inputValues, moveVerifyingKey());
    }
}
