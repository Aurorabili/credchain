export function useCredentialUi() {
    function credentialTypeKey(input: { credentialType: number }) {
        return input.credentialType === 1 ? "institution-auth" as const : "standard" as const;
    }

    function credentialTypeLabel(input: { credentialType: number }) {
        return credentialTypeKey(input) === "institution-auth" ? "机构鉴权" : "普通凭证";
    }

    function statusKey(input: { revoked: boolean; expired?: boolean; trusted: boolean }) {
        if (input.revoked) return "revoked" as const;
        if (input.expired) return "expired" as const;
        return input.trusted ? "trusted" as const : "self" as const;
    }

    function statusLabel(input: { revoked: boolean; expired?: boolean; trusted: boolean }) {
        const key = statusKey(input);
        if (key === "revoked") return "已吊销";
        if (key === "expired") return "已过期";
        if (key === "self") return "自签名";
        return "受信任";
    }

    function statusHeadline(input: { revoked: boolean; expired?: boolean; trusted: boolean; credentialType: number }) {
        const key = statusKey(input);
        if (key === "revoked") return "该凭证已被吊销";
        if (key === "expired") return "该凭证已过有效期";
        if (credentialTypeKey(input) === "institution-auth") return "这是一个机构鉴权 SBT";
        if (key === "self") return "该凭证当前为自签名状态";
        return "该凭证已被受信任身份签署";
    }

    function statusDescription(input: { revoked: boolean; expired?: boolean; trusted: boolean; credentialType: number }) {
        const key = statusKey(input);
        if (key === "revoked") return "链上记录仍可查询，但不应再用于可信证明。";
        if (key === "expired") return "凭证元数据仍可访问，但应结合有效期判断使用场景。";
        if (credentialTypeKey(input) === "institution-auth") return "持有该 SBT 的钱包可代表对应机构，对普通凭证执行受信任签发或背书。";
        if (key === "self") return "当前只有持有人自己完成签发，还没有治理或机构身份加入背书。";
        return "该凭证已获得治理身份或机构身份的签署，可用于更高可信度的校验。";
    }

    function signerRoleLabel(role: number) {
        if (role === 2) return "治理";
        if (role === 1) return "机构";
        return "持有人";
    }

    return {
        credentialTypeKey,
        credentialTypeLabel,
        statusKey,
        statusLabel,
        statusHeadline,
        statusDescription,
        signerRoleLabel
    };
}
