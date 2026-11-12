package com.mycompany.myapp.domain;

import com.mycompany.myapp.domain.enumeration.ReminderChannel;
import com.mycompany.myapp.domain.enumeration.ReminderRule;
import jakarta.persistence.*;
import java.io.Serializable;
import java.time.Instant;
import java.time.LocalDate;
import lombok.Getter;
import lombok.Setter;

/** Relance envoyée à un membre (SMS ou lien WhatsApp ouvert depuis l'application). */
@Getter
@Setter
@Entity
@Table(name = "reminder")
public class Reminder implements Serializable {

    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    @Enumerated(EnumType.STRING)
    @Column(name = "rule", length = 20, nullable = false)
    private ReminderRule rule;

    @Enumerated(EnumType.STRING)
    @Column(name = "channel", length = 20, nullable = false)
    private ReminderChannel channel;

    /** Échéance visée : une seule relance par règle et par échéance. */
    @Column(name = "target_end_date")
    private LocalDate targetEndDate;

    @Column(name = "message", length = 600)
    private String message;

    @Column(name = "sent_at", nullable = false)
    private Instant sentAt = Instant.now();

    @Column(name = "sent_by", length = 100)
    private String sentBy;
}
