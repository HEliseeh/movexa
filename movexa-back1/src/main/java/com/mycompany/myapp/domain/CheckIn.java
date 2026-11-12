package com.mycompany.myapp.domain;

import com.mycompany.myapp.domain.enumeration.CheckInMethod;
import com.mycompany.myapp.domain.enumeration.CheckInResult;
import jakarta.persistence.*;
import java.io.Serializable;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;

/** Passage d'un membre à l'accueil, autorisé ou refusé. */
@Getter
@Setter
@Entity
@Table(name = "check_in")
public class CheckIn implements Serializable {

    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    @Column(name = "checked_at", nullable = false)
    private Instant checkedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "method", length = 20, nullable = false)
    private CheckInMethod method;

    @Enumerated(EnumType.STRING)
    @Column(name = "result", length = 20, nullable = false)
    private CheckInResult result;

    @Column(name = "agent", length = 100)
    private String agent;

    /** Généré par le navigateur : un pointage hors ligne renvoyé deux fois n'est enregistré qu'une fois. */
    @Column(name = "client_id", length = 40, unique = true)
    private String clientId;
}
